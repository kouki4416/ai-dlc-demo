# Services — Ideation Portal

**Date**: 2026-05-03
**Scope**: サービスレイヤの定義・責務・オーケストレーション。各 Module 内 Service が他 Service とどう協調するか。
**Source**: `components.md` + `component-methods.md`

---

## サービス階層

### レイヤ構造（Standard Layered）

```
HTTP Request
    ↓
Controller (HTTP, DTO 変換, 認証ガード)
    ↓
Service (ビジネスロジック、ドメインルール)
    ↓
Repository (Prisma 経由の DB アクセス)
    ↓
MySQL
```

### サービス分類

| 種別 | サービス例 | 役割 |
|---|---|---|
| **Domain Service** | IdeasService, EvaluationsService, CyclesService | ビジネスロジック中核、エンティティ操作 |
| **Application Service** | AggregationService, SseService | オーケストレーション・複数ドメイン横断・イベント配信 |
| **Infrastructure Service** | PrismaService, FileStorageService, AuditLogService | 外部リソース・横断的関心事 |

---

## 主要サービスとオーケストレーションパターン

### S1. AuthService ↔ UsersService
- **Pattern**: Composition
- **Flow**:
  1. `AuthService.login(email, pwd)` → `UsersService.findByEmail(email)` でユーザー取得
  2. パスワードハッシュ検証（bcrypt.compare）
  3. JWT 発行（accessToken + refreshToken）
  4. RefreshToken DB 保存（revoke 用）
- **Errors**: 失敗時は `InvalidCredentialsException`、DB の `failedAttempts` カウント連動でロック

### S2. IdeasService → AttachmentsHandler / FileStorageService
- **Pattern**: Delegation
- **Flow** (`attachImage` 時):
  1. `IdeasService.attachImage()` がファイルメタデータ検証
  2. `FileStorageService.save(buffer)` で `uploads/` に保存し、相対パスを返す
  3. `IdeasService` が `Attachment` レコードを Prisma で作成
- **失敗時**: ファイル保存後に DB 失敗 → `FileStorageService.delete()` でロールバック（Saga 風）

### S3. EvaluationsService の独立性ガード
- **Pattern**: Guard + Repository filter
- **Flow** (`getMyScore` / `saveDraft`):
  1. Controller が `JwtAuthGuard` + `RolesGuard('PANEL')` で認可
  2. `EvaluationsService` が `panelistId === currentUser.id` を強制（API 経由で他人の panelistId は拒否）
  3. Repository クエリは常に `WHERE panelist_id = :currentUserId` で絞り込み
- **`getDetailedScores` の特殊認可**: viewer が Admin / 投稿者本人 かつ Cycle.status === 'CLOSED' のみアクセス可

### S4. CyclesService.closeCycle のオーケストレーション
- **Pattern**: Orchestration / Transaction
- **Flow** (`closeCycle`):
  1. **トランザクション開始**（Prisma `$transaction`）
  2. 当該 Cycle の全公開アイデアに対し `AggregationService.calculateAverageScore(ideaId)` 実行
  3. 各 Idea に `aggregatedScore` を永続化（snapshot 保存）
  4. `AggregationService.determineTopThree(cycleId)` で上位3を決定
  5. Top3 Idea の `is_anonymized = false` フラグ更新（匿名解除）
  6. Cycle.status = 'CLOSED' に更新
  7. **コミット**
  8. SSE `cycle.closed` イベント発火 → DashboardModule.SseService に通知
- **冪等性**: 同 Cycle に対する2回目の close は no-op + 警告

### S5. DashboardService → SseService の連携
- **Pattern**: Pub-Sub (Observer) + In-process EventBus
- **Flow** (例: 評価確定時):
  1. `EvaluationsService.finalize()` 完了直後に NestJS の `EventEmitter2` で `evaluation.finalized` イベント発火
  2. `SseService` が listener として購読、開いている SSE 接続クライアントにイベント送信
  3. クライアント（Dashboard 画面）はイベント受信時にリーダーボードを再取得 / 部分更新
- **イベント種類**: `idea.published`, `evaluation.finalized`, `cycle.closed`, `idea.removed`
- **配信フィルタ**: viewer のロールが Panel 以下なら詳細スコアは除外

### S6. AdminService.removeIdea + AuditLogService
- **Pattern**: Cross-cutting (Decorator / Interceptor 候補)
- **Flow**:
  1. `AdminService.removeIdea(adminId, ideaId, reason)`
  2. `IdeasService.markAsRemoved(ideaId)` でソフト削除（status='REMOVED'）
  3. `AuditLogService.log({ actorId: adminId, action: 'IDEA_REMOVED', targetId: ideaId, reason })`
  4. SSE `idea.removed` イベント発火
- **監査要件**: 全 Admin 操作（パネル任命/解除、アイデア削除、サイクル close）は AuditLog に記録

### S7. RecognitionService の読み取り専用性
- **Pattern**: Read-Only View / CQRS-lite
- **Flow**: `getCurrentHallOfFame()` / `getHistory()` は `Cycle.status='CLOSED'` のサイクルのみ参照、書き込み一切なし
- **キャッシング**: メモリキャッシュ（短時間 TTL）でリーダーボードと殿堂の読み取りを高速化（NFR-1.2 ロード2秒対応）

---

## 横断的関心事（Cross-Cutting）

### Authorization Pipeline
```
Request → JwtAuthGuard (extract user) → RolesGuard (check role) → ResourceOwnershipGuard (check ownership) → Controller
```
- `JwtAuthGuard`: Authorization ヘッダから JWT 検証、`req.user` 設定
- `RolesGuard`: `@Roles('ADMIN')` デコレータでロールチェック
- `ResourceOwnershipGuard`: 例えば Idea 編集時に `req.user.id === idea.authorId` をチェック

### Validation Pipeline
- `ValidationPipe` (NestJS 標準) + class-validator デコレータで DTO バリデーション
- 失敗時は 400 Bad Request + フィールドごとのエラー詳細

### Exception Filter
- グローバル `GlobalExceptionFilter` が全例外をキャッチ
- 既知の例外（NotFoundException, ForbiddenException 等）→ 適切な HTTP ステータス
- 未知の例外 → 500 + ログ + 一般化メッセージ（情報漏洩防止）

### Anonymization Helper（重要）
- `IdeaAnonymizationHelper.shouldRevealAuthor(idea, viewer, cycle): boolean`
  - 投稿者本人 → true
  - Admin → cycle.status === 'CLOSED' なら true
  - 一般閲覧者 → idea.is_anonymized === false （= Top3 表彰後）なら true
  - それ以外 → false
- `IdeasService` / `RecognitionService` / `DashboardService` の DTO マッピング時に必ず通す

### Score Visibility Helper
- `ScoreVisibilityHelper.canViewDetailedScores(idea, viewer, cycle): boolean`
  - Admin → cycle.status === 'CLOSED' なら true
  - 投稿者本人 → cycle.status === 'CLOSED' なら true
  - Panel → 自分のスコアのみ常に true、他パネル分は false
  - その他 → false

---

## サービス相互作用ダイアグラム

```
+-------------+
| Controllers | (HTTP layer, DTO 変換, Guards)
+------+------+
       |
       v
+--------------------------------------------------+
|  Domain Services                                 |
|  +---------+  +---------+  +--------------+      |
|  | Auth    |<-| Users   |  | Ideas        |      |
|  +---------+  +---------+  +------+-------+      |
|                                   |              |
|  +-------------+  +------------+  |              |
|  | Evaluations |<-| Cycles     |<-+              |
|  +------+------+  +-----+------+                 |
|         |               |                        |
|         +-->+----------+|                        |
|             |Aggregation| (CyclesModule内)        |
|             +----------+                         |
+----------------+---------------------------------+
                 |
                 v
+----------------------------------------+
|  Application Services                  |
|  +----------+  +--------------------+  |
|  | SseSvc   |<-| EventEmitter (Nest)|  |
|  +----------+  +--------------------+  |
|  +--------------+  +--------------+    |
|  | Recognition  |  | Admin        |    |
|  +--------------+  +--------------+    |
+----------------+-----------------------+
                 |
                 v
+----------------------------------------+
|  Infrastructure Services               |
|  +---------+ +--------------+ +------+ |
|  | Prisma  | | FileStorage  | |Audit | |
|  +---------+ +--------------+ +------+ |
+----------------------------------------+
```

---

## トランザクション境界

| 操作 | トランザクション範囲 |
|---|---|
| `IdeasService.publishIdea` | Idea status 変更 + 監査ログ |
| `EvaluationsService.finalize` | Score 確定 + Idea 集計サマリ更新（オプショナル） |
| `CyclesService.closeCycle` | **大トランザクション**: 全 Idea 集計 + Top3 確定 + 匿名解除 + Cycle 状態変更 |
| `AdminService.removeIdea` | Idea ステータス + 監査ログ |
| `IdeasService.attachImage` | Saga: ファイル保存 → DB 挿入。失敗時にファイル削除でロールバック |

**注**: Prisma の `$transaction` で同期的にラップ可能な操作のみ ACID。SSE イベント発火・ファイル削除はトランザクション外で実行（at-least-once / best-effort）。
