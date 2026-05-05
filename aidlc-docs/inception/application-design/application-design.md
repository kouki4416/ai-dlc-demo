# Application Design — Ideation Portal (Consolidated)

**Date**: 2026-05-03
**Status**: Awaiting Approval
**Source**: `requirements.md` + `stories.md` + `personas.md` + `application-design-plan.md`

このドキュメントは Application Design ステージの成果物 4 つ（`components.md` / `component-methods.md` / `services.md` / `component-dependency.md`）を統合した1枚ものリファレンスです。詳細は各専用ドキュメントを参照してください。

---

## 1. アーキテクチャ決定サマリ

| 項目 | 採用値 | 出典 |
|---|---|---|
| Frontend | Next.js (App Router) + TypeScript | requirements.md G1 |
| Backend | NestJS + TypeScript | requirements.md G2 |
| Database | MySQL 8.x | requirements.md G3 |
| ORM | **Prisma** | application-design-plan.md Q1=A |
| アーキスタイル | **Standard Layered** (Controller → Service → Repository) | Q2=A |
| 認証 | **JWT (Access + Refresh)** | Q3=A |
| Realtime | **SSE (Server-Sent Events)** | Q4=A |
| 画像保存 | **ローカルファイルシステム** (`uploads/`) | Q5=A |
| API スタイル | **REST + OpenAPI/Swagger** | Q6=A |
| 環境 | ローカル Docker Compose | requirements.md C-1 |

---

## 2. コンポーネント概要（バックエンド）

8つの Feature Module + 2つの Shared Module で構成:

| Module | 主担当 Epic | 担当 Persona | 主要責務 |
|---|---|---|---|
| **AuthModule** | EP-AUTH | 全 | ログイン / JWT / Guards |
| **UsersModule** | EP-AUTH/EP-ADMIN | 全/ADM | 登録 / プロフィール / ロール変更 |
| **IdeasModule** | EP-SUBMIT | SUB | 投稿 / ドラフト / 添付管理 |
| **EvaluationsModule** | EP-EVAL | PNL | スコアリング / 独立性ガード |
| **CyclesModule** | EP-REC/EP-ADMIN | ADM | サイクル運用 / 集計 / 上位3決定 / 匿名解除 |
| **DashboardModule** | EP-DASH | 全 | リーダーボード / SSE / 比較ビュー |
| **RecognitionModule** | EP-REC | 全 | 殿堂表示 |
| **AdminModule** | EP-ADMIN | ADM | パネル管理 / 削除 / メトリクス / 監査 |
| (Shared) PrismaModule | — | — | DB 接続 / トランザクション |
| (Shared) CommonModule | — | — | DTO / Exception / Validation / Guard 基盤 |

詳細: `components.md` 参照

---

## 3. フロントエンド構成（Next.js App Router）

```
app/
├── (auth)/                # 公開ルート（未認証）
│   ├── login
│   ├── register
│   └── password-reset
├── (app)/                 # 認証必須・全ロール
│   ├── page.tsx          # ロール別ホーム
│   ├── ideas/new
│   ├── ideas/[id]
│   ├── ideas/me
│   ├── dashboard
│   └── recognition
├── (panel)/               # Panel 専用
│   ├── panel/queue
│   └── panel/evaluate/[ideaId]
└── (admin)/               # Admin 専用
    ├── admin
    ├── admin/cycles
    ├── admin/panel
    ├── admin/ideas
    ├── admin/metrics
    └── admin/archives

lib/
├── api-client.ts         # fetch wrapper, JWT 自動付与, refresh 自動
├── auth-context.tsx      # 認証ステート
└── sse-client.ts         # EventSource ラッパー

components/
├── ui/                   # Form, Button, Card, Chart 等
├── idea/                 # アイデア表示
└── score/                # レーダーチャート / バー
```

詳細: `components.md` の F1〜F5 セクション参照

---

## 4. データモデル概要（高レベル）

```
User (id, email, passwordHash, displayName, role, createdAt)
  - role ∈ {SUBMITTER, PANEL, ADMIN}

RefreshToken (id, userId, token, revokedAt, expiresAt)

Cycle (id, name, startsAt, endsAt, status, closedAt)
  - status ∈ {ACTIVE, CLOSED}

Idea (id, authorId, cycleId, title, summary, problem, proposal,
      status, isAnonymized, aggregatedScoreSnapshot, archivedAt,
      removedAt, removedReason, createdAt, updatedAt)
  - status ∈ {DRAFT, PUBLISHED, REMOVED, ARCHIVED}
  - isAnonymized = true (default) → 上位3確定で false に変更

Attachment (id, ideaId, fileName, mimeType, sizeBytes, storedPath, createdAt)

Evaluation (id, ideaId, panelistId, feasibility, impact, innovation,
            comment, status, finalizedAt, createdAt, updatedAt)
  - status ∈ {DRAFT, FINALIZED}
  - UNIQUE (ideaId, panelistId)

AuditLog (id, actorId, action, targetType, targetId, reason, createdAt)
```

詳細フィールド型・制約は **Functional Design (Construction フェーズ)** で詳細化。

---

## 5. 主要 REST エンドポイント一覧

| Method | Path | Module | 認可 |
|---|---|---|---|
| POST | `/auth/login` | Auth | Public |
| POST | `/auth/refresh` | Auth | Public (with refresh token) |
| POST | `/auth/logout` | Auth | Authenticated |
| POST | `/users` | Users | Public |
| GET | `/users/me` | Users | Authenticated |
| POST | `/users/password-reset/request` | Users | Public |
| POST | `/users/password-reset/confirm` | Users | Public |
| PATCH | `/users/:id/role` | Users | Admin |
| POST | `/ideas` | Ideas | Authenticated |
| GET | `/ideas` | Ideas | Authenticated |
| GET | `/ideas/:id` | Ideas | Authenticated |
| GET | `/ideas/me/drafts` | Ideas | Authenticated (own) |
| GET | `/ideas/me/published` | Ideas | Authenticated (own) |
| PATCH | `/ideas/:id` | Ideas | Owner only, draft only |
| POST | `/ideas/:id/publish` | Ideas | Owner only |
| POST | `/ideas/:id/attachments` | Ideas | Owner only, draft only |
| DELETE | `/ideas/:id/attachments/:aid` | Ideas | Owner only, draft only |
| GET | `/evaluations/queue` | Evaluations | Panel |
| GET | `/evaluations/idea/:ideaId` | Evaluations | Panel |
| POST | `/evaluations/idea/:ideaId/draft` | Evaluations | Panel |
| POST | `/evaluations/idea/:ideaId/finalize` | Evaluations | Panel |
| GET | `/evaluations/idea/:ideaId/details` | Evaluations | Admin/Owner, cycle closed |
| POST | `/cycles` | Cycles | Admin |
| GET | `/cycles` | Cycles | Authenticated |
| GET | `/cycles/active` | Cycles | Authenticated |
| POST | `/cycles/:id/close` | Cycles | Admin |
| GET | `/cycles/:id/winners` | Cycles | Authenticated |
| GET | `/dashboard/leaderboard` | Dashboard | Authenticated |
| GET | `/dashboard/summary` | Dashboard | Authenticated |
| GET | `/dashboard/comparison` | Dashboard | Authenticated |
| GET | `/dashboard/stream` | Dashboard (SSE) | Authenticated |
| GET | `/recognition/current` | Recognition | Authenticated |
| GET | `/recognition/history` | Recognition | Authenticated |
| GET | `/admin/panel-members` | Admin | Admin |
| GET | `/admin/users` | Admin | Admin |
| DELETE | `/admin/ideas/:id` | Admin | Admin |
| GET | `/admin/archives` | Admin | Admin |
| GET | `/admin/metrics` | Admin | Admin |
| GET | `/admin/audit-log` | Admin | Admin |

メソッドシグネチャ・DTO 定義: `component-methods.md` 参照

---

## 6. 横断的関心事（Cross-Cutting Concerns）

### 認証・認可パイプライン
```
Request → JwtAuthGuard → RolesGuard → ResourceOwnershipGuard → Controller
```

### 重要 Helper（業務ルール集約）
- **`IdeaAnonymizationHelper.shouldRevealAuthor(idea, viewer, cycle)`** — 投稿者氏名表示の唯一の意思決定点
- **`ScoreVisibilityHelper.canViewDetailedScores(idea, viewer, cycle)`** — 詳細スコア閲覧可否

### グローバル例外ハンドラ
- 全例外を `GlobalExceptionFilter` がキャッチ → ApiResponse 統一形式に変換
- 未知の例外は 500 + ログ + 一般化メッセージ（情報漏洩防止）

### バリデーション
- `class-validator` + `ValidationPipe` で DTO 自動検証
- ファイルサイズ・MIME タイプは Multer Interceptor で検証

詳細: `services.md` の「横断的関心事」セクション参照

---

## 7. イベント駆動とリアルタイム配信

### EventEmitter2 で発火されるイベント

| Event | Producer | Consumer |
|---|---|---|
| `idea.published` | IdeasService | SseService |
| `evaluation.finalized` | EvaluationsService | SseService + DashboardService (cache invalidation) |
| `cycle.closed` | CyclesService | SseService + RecognitionService (cache update) |
| `idea.removed` | AdminService | SseService |

### SSE 配信 (`GET /dashboard/stream`)
- Content-Type: `text/event-stream`
- ロール別フィルタ: Panel 以下には詳細スコア除外
- 接続ハートビート: 30秒に1回 keep-alive コメント送信
- Graceful disconnect: クライアント切断検出で `Subject.complete()`

詳細: `services.md` S5 + `component-dependency.md` Flow 2 参照

---

## 8. トランザクション境界

| 操作 | トランザクション範囲 | 注意点 |
|---|---|---|
| `IdeasService.publishIdea` | Idea status 変更 + 監査ログ | Saga 不要 |
| `EvaluationsService.finalize` | Score 確定 (+ オプション集計サマリ更新) | UNIQUE (ideaId, panelistId) |
| `CyclesService.closeCycle` | **大トランザクション**: 全 Idea 集計 + Top3 確定 + 匿名解除 + Cycle 状態変更 | 失敗時に全ロールバック |
| `AdminService.removeIdea` | Idea ステータス + 監査ログ | 評価データは保持 |
| `IdeasService.attachImage` | **Saga**: ファイル保存 → DB 挿入 → 失敗時にファイル削除 | Prisma TX 外でファイル I/O |

詳細: `services.md` 「トランザクション境界」セクション参照

---

## 9. NFR 配分マッピング（後段の NFR Design への申し送り）

| NFR | 主担当 Module | 実装方針（仮） |
|---|---|---|
| NFR-1.1 100同時接続 | Dashboard, Auth | Node.js + connection pooling、JWT で水平スケール容易 |
| NFR-1.2 ロード 2秒以内 | 全 (FE/BE) | Next.js SSR/RSC + 軽量 API、Recognition/Dashboard は短期キャッシュ |
| NFR-1.3 反映 30秒以内 | Dashboard (SSE) | EventEmitter 即時 → SSE push、最遅でもブラウザ側ポーリング fallback |
| NFR-2.2 PW ハッシュ化 | Auth, Users | bcrypt (cost ≥ 10) |
| NFR-2.4 XSS/CSRF/SQLi | 全 | React 自動エスケープ + Prisma パラメータ化 + CSRF はオリジン検証 |
| NFR-2.5 RBAC + 独立性 | 全 (Guard) | RolesGuard + EvaluationsService の panelistId 強制フィルタ |
| NFR-5.2 ドラフト信頼性 | Ideas | 自動保存リトライ + UI に保存状態表示 |
| NFR-7.1 カバレッジ 80% | 全 | Jest + supertest、主要シナリオは E2E (Playwright) |

詳細: NFR Design (per-unit, Construction フェーズ) で具体化

---

## 10. Out of Scope（このステージで扱わないもの）

- 詳細業務ルール（境界条件、エラーメッセージ文言、再試行ポリシー） → **Functional Design** で扱う
- パフォーマンスチューニング、キャッシュサイズ、N+1 対策の具体実装 → **NFR Design** で扱う
- ファイルパス・ディレクトリ構造の確定、Docker Compose の最終形 → **Code Generation** Plan フェーズで扱う
- 本番デプロイ・監視 → **Operations フェーズ**（プレースホルダ、現プロジェクトでは扱わない）

---

## 11. 参照ドキュメント

| ファイル | 内容 |
|---|---|
| `components.md` | コンポーネント定義・責務・REST インターフェース一覧 |
| `component-methods.md` | サービスメソッドシグネチャ + DTO 型定義 |
| `services.md` | サービスレイヤ・オーケストレーション・横断的関心事 |
| `component-dependency.md` | 依存マトリックス + 通信パターン + データフロー図 |
| `application-design.md` (本ファイル) | 上記4つを統合した1枚もの |
