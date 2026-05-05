# U0 — Business Rules

**Date**: 2026-05-05
**Status**: Generated
**Source**: functional-design-plan Q9 / requirements.md / stories.md

このドキュメントは U0 が定義し、後続ユニット (U1〜U6) が遵守すべき横断的ビジネスルールを記述します。

---

## 1. 認証・認可ルール

### BR-AUTH-001: パスワード強度
- 最小長: **8 文字**
- 文字種: 英大文字 / 英小文字 / 数字 を最低 1 つずつ含む
- 記号は任意（必須ではない）
- 違反時: 400 Bad Request `code=PASSWORD_WEAK`

### BR-AUTH-002: パスワード保存
- bcrypt cost=10 でハッシュ化
- 平文パスワードは DB / ログ / レスポンスに含めない
- 認証エラーメッセージは「メールまたはパスワードが正しくありません」と統一（ユーザー存在/非存在を区別しない）

### BR-AUTH-003: JWT 構造
- Access Token: TTL 15 分、claims = `{sub: userId, email, role, iat, exp}`
- Refresh Token: TTL 7 日、claims = `{sub: userId, iat, exp}`、DB 永続化（hash 保存）
- 署名: HS256、Secret は `JWT_SECRET` env (32 文字以上必須)
- Access Token 失効後は 401 → クライアント側で refresh エンドポイント呼び出し

### BR-AUTH-004: Refresh Rotation
- Refresh 利用毎に旧 RT を `revokedAt=now()` 設定し、新 RT 発行
- 失効済 RT を再利用された場合（盗難検出）: 当該ユーザーの全 RT を強制失効

### BR-AUTH-005: ロール定義
- `SUBMITTER`: 通常ユーザー（投稿可、評価不可、管理不可）
- `PANEL`: 評価パネル（投稿可 + 評価可）
- `ADMIN`: 管理者（全機能 + 管理画面アクセス）
- 1 ユーザー = 1 ロール（複数ロール持ち禁止）
- ロール変更は ADMIN のみ実行可、AuditLog 記録必須

### BR-AUTH-006: ログイン制限
- 連続ログイン失敗による自動ロック機能は **PoC では未実装**（要件外、将来拡張）
- IsActive=false のユーザーはログイン拒否（401）

### BR-AUTH-007: パスワードリセット
- リセットトークン TTL: **24 時間**
- トークンは 1 回限り使用可（usedAt 記録）
- リセット完了時、当該ユーザーの全 RefreshToken を強制失効（再ログイン要求）

---

## 2. Cycle ライフサイクル ルール

### BR-CYCLE-001: 同時 OPEN 制約
- `status=OPEN` の Cycle は **同時に 1 つのみ存在可能**
- 既に OPEN な Cycle がある場合、新規 OPEN Cycle 作成は 409 Conflict で拒否
- 違反コード: `code=CYCLE_OPEN_EXISTS`

### BR-CYCLE-002: 期間設定
- `startsAt < endsAt` 必須
- `startsAt`, `endsAt` は変更可（CLOSED 化前のみ）
- 過去日時の指定は許可（バックフィル用途）

### BR-CYCLE-003: CLOSED 化処理
- ADMIN のみ実行可
- `$transaction` 内で以下を原子的に実施:
  1. Score (CONFIRMED) 集計
  2. Top 3 決定（同点は createdAt 昇順）
  3. `cycle.status=CLOSED, closedAt=now(), top3IdeaIds=...`
  4. AuditLog (CYCLE_CLOSE) 記録
- トランザクション失敗時はロールバック
- SSE publish (`cycle.closed`) はトランザクション完了後

### BR-CYCLE-004: CLOSED 後の不変性
- `cycle.status=CLOSED` の Cycle に紐付く Idea / Score の **書き込み禁止**
- Idea publish, Score upsert/confirm は 409 で拒否（`code=CYCLE_CLOSED`）
- Admin による idea.delete は CLOSED 後も可能（不適切投稿削除は履歴ベース）

### BR-CYCLE-005: 匿名解除のタイミング
- `cycle.status=OPEN` 中: API レスポンスから `idea.submitterId / submitter` 除外
- `cycle.status=CLOSED` 後: API レスポンスに submitter 情報含める
- 例外: SUBMITTER 自身は OPEN 中でも自分の Idea の submitter 情報を取得可能（My Page）
- 例外: ADMIN は OPEN 中も全 submitter 情報を取得可能

---

## 3. Idea ルール

### BR-IDEA-001: 入力バリデーション (US-016)
| Field | ルール |
|---|---|
| title | 1〜120 文字、空白のみ NG (`title.trim().length >= 1`) |
| description | 1〜5000 文字、空白のみ NG |
| 添付数 | 0〜5 個 |
| 添付ファイルサイズ | 1 ファイル ≤ 5MB |
| 添付 mimeType | `image/png`, `image/jpeg` のみ |

違反時: 400 Bad Request、`code=VALIDATION_ERROR`、message に詳細

### BR-IDEA-002: ステータス遷移
- `DRAFT → PUBLISHED` (投稿者のみ、Cycle OPEN 中のみ)
- `PUBLISHED → DELETED` (Admin のみ、理由必須)
- `DRAFT → DELETED` (投稿者本人 or Admin、理由は本人なら任意)
- **不可逆**: `PUBLISHED → DRAFT` 不可、`DELETED → *` 不可

### BR-IDEA-003: 公開後編集不可 (US-015)
- `status=PUBLISHED` の Idea: title / description / attachments の更新を 403 Forbidden で拒否
- 例外: Admin による delete (status 変更のみ)

### BR-IDEA-004: ドラフト自動保存 (US-009)
- FE が編集中、**5 秒間入力なし** で自動保存トリガー
- 自動保存中はサーバ往復で `PATCH /api/ideas/{id}` (status=DRAFT のみ更新可)
- 同時編集: 楽観ロックは PoC では未実装、最後の保存が勝つ（要件外）

### BR-IDEA-005: 投稿対象 Cycle
- 新規 Idea 作成時: 現在 OPEN な Cycle に自動紐付け
- OPEN な Cycle がない場合: 409 Conflict (`code=NO_ACTIVE_CYCLE`)
- 1 投稿者あたりの投稿数上限: **PoC では制限なし**（要件外）

### BR-IDEA-006: 削除時の連鎖 (US-039)
- Idea DELETED 化時: 紐付く Score は **保持**（履歴のため）、ただし集計対象外
- Idea DELETED 化時: 紐付く IdeaAttachment は **保持**（DB レベル）、ファイル本体は保持（手動削除は管理画面の別操作）

---

## 4. Score ルール

### BR-SCORE-001: スコア値範囲 (FR-4.2)
- feasibility / impact / innovation: **1〜5 整数**
- 0 / 6 以上 / 小数 / 負数 → 400 Bad Request

### BR-SCORE-002: スコアの主体
- 評価可能ロール: **PANEL のみ**
- ADMIN は評価不可（独立性確保）
- SUBMITTER は評価不可（自分のアイデア含む）

### BR-SCORE-003: 1 パネル × 1 アイデア = 1 スコア (DB UNIQUE)
- 同一 (panelId, ideaId) で 2 件目作成は 409 Conflict
- 既存 Score が DRAFT の場合は upsert (UPDATE)、CONFIRMED の場合は 409 (`code=SCORE_CONFIRMED`)

### BR-SCORE-004: ステータス遷移
- `DRAFT → CONFIRMED` (パネル本人のみ)
- `CONFIRMED → DRAFT` 不可（FR-4.6: 確定操作で締め切る）

### BR-SCORE-005: 確定要件 (US-022)
- 全 3 軸（feasibility / impact / innovation）が入力済み（NULL 不可）
- 1 軸でも未入力なら 400 Bad Request (`code=SCORE_INCOMPLETE`)
- comment は任意（NULL 許可）

### BR-SCORE-006: スコア修正 (US-021)
- DRAFT 状態のスコアは Cycle OPEN 中いつでも修正可
- CONFIRMED 状態のスコアは修正不可（FR-4.6）
- Cycle CLOSED 後はあらゆるスコア変更不可

### BR-SCORE-007: 他パネルスコア非公開 (FR-5.1, US-024)
- Cycle OPEN 中:
  - PANEL は自分の Score のみ閲覧可
  - 他パネルの Score は API レベルで返却しない
  - ADMIN も OPEN 中は集計値のみ閲覧可、個別パネルの Score は非公開
- Cycle CLOSED 後 (FR-5.3):
  - ADMIN: 全 Score 閲覧可（誰が何点付けたか）
  - SUBMITTER (自分のアイデア): 全 Score 閲覧可（誰が何点付けたか）
  - PANEL: 自分の Score のみ閲覧可（変わらず）

---

## 5. 集計ルール (FR-6, Q9 確定)

### BR-AGG-001: 平均計算
- 平均値の精度: **小数点以下 2 桁**（四捨五入）
- 集計対象: `Score.status=CONFIRMED` のみ

### BR-AGG-002: 総合スコアの 2 表示 (FR-6.1)
- `total_avg` = 3 軸平均値の平均 (小数 2 桁)
- `total_sum` = 3 軸平均値の合計 (小数 2 桁)
- UI で **両方表示**（FR-6.1 注釈）

### BR-AGG-003: 上位 3 決定の同点処理
- 第一順位: `total_sum` 降順
- 第二順位（同点時）: `Idea.createdAt` 昇順（先に投稿された方が上位）
- 第三順位（さらに同点時）: `Idea.id` 昇順（決定論的）

### BR-AGG-004: 評価未完了アイデアの扱い (FR-6.3)
- 部分評価のアイデアは集計対象に含める（暫定スコア）
- ダッシュボード表示には **"N人/M人完了"** ステータスを併記
- N = CONFIRMED 数、M = 評価対象パネル総数 (`role=PANEL AND isActive=true`)

### BR-AGG-005: 0 評価アイデアの扱い
- CONFIRMED スコアが 0 件のアイデアは: `total_avg=0, total_sum=0`
- リーダーボードでは末尾扱い（同点処理ルールにより createdAt 昇順）

### BR-AGG-006: 削除済アイデアの扱い
- `Idea.status=DELETED` は集計対象外
- 上位 3 決定の対象外
- ダッシュボード非表示（Admin の「削除済一覧」のみで閲覧）

---

## 6. SSE 配信ルール

### BR-SSE-001: 認証必須
- `GET /api/events` への接続には JWT 必要（query param `token=` または Cookie）
- 認証失敗: HTTP 401 で接続拒否

### BR-SSE-002: 配信制限（プライバシー保護）
| Event | ADMIN | PANEL | SUBMITTER |
|---|---|---|---|
| `idea.published` | ✓ | ✓ | ✓ |
| `score.confirmed` | ✓（全件） | ✗ | ✗ |
| `cycle.closed` | ✓ | ✓ | ✓ |
| `idea.deleted` | ✓（reason 含む） | ✓（reason 除外） | 自分の Idea のみ（reason 除外） |

### BR-SSE-003: 接続維持
- Heartbeat: **15 秒ごと** に `: ping\n\n` 送信
- 接続タイムアウト: **5 分間 heartbeat 応答なし** で切断
- クライアント自動再接続は EventSource ネイティブ動作に任せる

### BR-SSE-004: 配信遅延 (NFR-1.3)
- イベント発生から SSE 配信まで **30 秒以内**
- インメモリ Pub/Sub で実装（Redis 不要、PoC 規模で十分）

---

## 7. 監査ログ ルール

### BR-AUDIT-001: 必須記録イベント
domain-entities.md の AuditLog アクション一覧（10 種類）は **必須記録**。記録漏れは BR 違反。

### BR-AUDIT-002: 記録タイミング
- ビジネスロジック完了後（コミット後）に記録
- 失敗時は記録しない
- ベストエフォート（AuditLog 書き込み失敗で本処理を失敗にはしない、ログ出力のみ）

### BR-AUDIT-003: PII 取り扱い
- `metadata` には メールアドレス / パスワードハッシュ / トークン を **記録しない**
- ロール変更等の機密性ある変更も内容（from/to）のみ記録

---

## 8. ロール別アクセス権サマリ

| 機能 | SUBMITTER | PANEL | ADMIN |
|---|---|---|---|
| アカウント登録/ログイン | ✓ | ✓ | ✓ |
| Idea 作成・編集（DRAFT） | ✓ | ✓ | ✓ |
| Idea 公開 | ✓（自分） | ✓（自分） | ✓ |
| 自分の投稿閲覧 | ✓ | ✓ | ✓ |
| 評価対象一覧閲覧 | ✗ | ✓ | ✓（参考） |
| Score 入力・確定 | ✗ | ✓ | ✗ |
| ダッシュボード | ✓ | ✓ | ✓ |
| 殿堂閲覧 | ✓ | ✓ | ✓ |
| 詳細スコア閲覧（CLOSED 後） | 自分の Idea のみ | ✗ | ✓ |
| Cycle 作成・終了 | ✗ | ✗ | ✓ |
| パネルメンバー任命/解除 | ✗ | ✗ | ✓ |
| 不適切投稿削除 | ✗ | ✗ | ✓ |
| メトリクス閲覧 | ✗ | ✗ | ✓ |
| AuditLog 閲覧 | ✗ | ✗ | ✓ |

---

## 9. 違反時のレスポンス形式

### 統一エラーレスポンス
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "title must be longer than or equal to 1 characters",
  "code": "VALIDATION_ERROR",
  "timestamp": "2026-05-05T10:00:00Z",
  "path": "/api/ideas/draft"
}
```

### code 一覧（U0 が定義、各ユニットが使用）

| code | HTTP | 意味 |
|---|---|---|
| `VALIDATION_ERROR` | 400 | DTO バリデーション違反 |
| `PASSWORD_WEAK` | 400 | パスワード強度不足 |
| `SCORE_INCOMPLETE` | 400 | 確定時 3 軸未入力 |
| `INVALID_CREDENTIALS` | 401 | ログイン失敗 |
| `TOKEN_EXPIRED` | 401 | Access Token 期限切れ |
| `TOKEN_INVALID` | 401 | Token 検証失敗 |
| `INSUFFICIENT_ROLE` | 403 | ロール不足 |
| `EDIT_FORBIDDEN` | 403 | 公開後編集不可 |
| `NOT_FOUND` | 404 | リソース未存在 |
| `CYCLE_OPEN_EXISTS` | 409 | OPEN Cycle 重複 |
| `CYCLE_CLOSED` | 409 | CLOSED 後の更新試行 |
| `SCORE_CONFIRMED` | 409 | CONFIRMED 後の更新試行 |
| `NO_ACTIVE_CYCLE` | 409 | OPEN Cycle 不在 |
| `INTERNAL_ERROR` | 500 | サーバ内部エラー |
