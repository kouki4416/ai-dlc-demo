# U0 Shared Foundation — Functional Design Plan

**Date**: 2026-05-05
**Status**: ✅ Approved — All AI recommendations adopted (2026-05-05)
**Unit**: U0 Shared Foundation (横断技術ユニット)
**Source**: `unit-of-work.md` U0 定義 + `requirements.md` (FR-4 スコア / NFR-1〜6) + `application-design.md`

---

## 0. Functional Design スコープ確認

U0 は技術基盤ユニットですが、ここで確定する設計は **全システムの土台** となります:

| 領域 | 内容 |
|---|---|
| **Prisma Schema** | 全 7 テーブル (User / RefreshToken / PasswordResetToken / Idea / IdeaAttachment / Score / Cycle / AuditLog) のフィールド・型・制約・リレーション |
| **JWT 構造** | Access/Refresh のクレーム・TTL・署名アルゴリズム |
| **SSE Event Taxonomy** | 全イベント名・ペイロード形式 |
| **Validation Strategy** | DTO クラス + バリデーションライブラリ |
| **Error Response Format** | 全 API 共通のエラーレスポンス形式 |
| **Logger / Audit** | 構造化ログ形式・監査ログ対象 |
| **FE 共通基盤** | RootLayout / Navigation / API client / SSE client / 共通 hooks |

---

## 1. 設計が必要な領域（質問）

各質問の `[Answer]:` に直接回答してください（A/B/C 等の選択肢、または自由記述）。AI 推奨が既記入されています。

---

### Q1. ID 生成戦略（Domain Model）

**問**: 全テーブルの主キー (User.id, Idea.id, Score.id, Cycle.id 等) はどの戦略で生成しますか？

- **A. UUID v4 (string)**: 文字列 36 文字。Prisma の `@default(uuid())` 利用。グローバル一意、URL 安全、推測困難。
- **B. CUID (string)**: 文字列 25 文字、衝突耐性高、時刻順ソート可能。Prisma の `@default(cuid())`。
- **C. Auto-increment Int**: 整数連番。シンプルだが ID から順序が読めて推測可能。
- **D. ULID (string)**: 26 文字、時刻順ソート可能、UUID v4 と同等のランダム性。

**AI 推奨**: **B (CUID)**。理由:
1. URL に含めても安全 (`/ideas/clxyz...`)
2. DB 側でソートすると時刻順になり、デバッグ・運用が楽
3. UUID v4 より短く、Prisma 標準サポート
4. ローカル PoC では衝突心配不要

[Answer]: B

---

### Q2. User テーブル設計（Domain Model）

**問**: User の最終フィールド構成は？

- **A.** AI 推奨スキーマ（下記）で確定
- **B.** 修正したい（[Answer] に修正点を記述）

**AI 推奨スキーマ**:
```prisma
model User {
  id              String   @id @default(cuid())
  email           String   @unique           // ログインID
  passwordHash    String                     // bcrypt
  name            String                     // 表示名 (本名)
  role            UserRole @default(SUBMITTER) // SUBMITTER | PANEL | ADMIN
  isActive        Boolean  @default(true)    // 退職等で false (論理削除)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  ideas           Idea[]
  scores          Score[]                    // panelId 経由
  refreshTokens   RefreshToken[]
  passwordResets  PasswordResetToken[]

  @@index([role, isActive])
}

enum UserRole {
  SUBMITTER
  PANEL
  ADMIN
}
```

**論点**:
- 削除は論理削除 (isActive=false) を採用 — 投稿履歴を保持するため
- メール検証 (確認メール送信) は要件外 → emailVerified カラムなし
- パスワード履歴 (再利用禁止) は要件外 → passwordHistory なし

[Answer]: A

---

### Q3. RefreshToken / PasswordResetToken 設計

**問**: トークン管理方式は？

- **A. DB 永続化 + Rotation (推奨)**: RefreshToken テーブルに保存、refresh 時に古い token 失効・新 token 発行。失効済 token の再利用検出可能。
- **B. ステートレス (DB 保存しない)**: JWT 自身に refresh も含め、TTL のみで管理。シンプルだが失効不可。
- **C. Redis 保存**: 高速だが PoC でインフラ追加が必要。

**AI 推奨**: **A**。理由: 規模 100 ユーザーで DB 負荷無問題、セキュリティ的にトークン失効可能性は重要、ローカル DB のみで完結。

**AI 推奨スキーマ**:
```prisma
model RefreshToken {
  id           String   @id @default(cuid())
  userId       String
  tokenHash    String   @unique           // ハッシュで保存 (生 token は DB に置かない)
  expiresAt    DateTime
  revokedAt    DateTime?                  // 失効済フラグ
  createdAt    DateTime @default(now())
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
}

model PasswordResetToken {
  id           String   @id @default(cuid())
  userId       String
  tokenHash    String   @unique
  expiresAt    DateTime                  // 24h TTL
  usedAt       DateTime?                 // 1回使用後失効
  createdAt    DateTime @default(now())
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
}
```

[Answer]: A

---

### Q4. JWT 構造と TTL（Business Rules）

**問**: JWT の TTL とクレーム構成は？

- **A. Access 15min / Refresh 7d / 標準クレーム**: 業界標準。クレーム = `{ sub: userId, email, role, iat, exp }`。
- **B. Access 1h / Refresh 30d**: PoC でログイン頻度を下げる。
- **C. Access 5min / Refresh 1d**: セキュリティ最大、UX 低。

**AI 推奨**: **A**。理由: PoC でも標準値が将来本番化時に再調整不要、role を JWT に入れることでガード処理が DB アクセスなしで完結。

**論点**:
- 署名アルゴリズム: **HS256** (対称鍵、PoC では十分)。Secret は `JWT_SECRET` env var (32 文字以上)。
- Refresh Rotation: 有効。Refresh 利用毎に新 RT 発行・旧 RT 失効。

[Answer]: A

---

### Q5. Idea / IdeaAttachment テーブル設計（Domain Model）

**問**: Idea のフィールド構成と公開状態管理は？

- **A.** AI 推奨スキーマ（下記）で確定
- **B.** 修正したい

**AI 推奨スキーマ**:
```prisma
model Idea {
  id           String      @id @default(cuid())
  title        String      @db.VarChar(120)  // バリデーション: 1〜120
  description  String      @db.Text          // バリデーション: 1〜5000
  status       IdeaStatus  @default(DRAFT)   // DRAFT | PUBLISHED | DELETED
  submitterId  String                        // 投稿者 (匿名解除前は API で隠蔽)
  cycleId      String                        // 紐付く評価サイクル
  publishedAt  DateTime?                     // PUBLISHED 移行時刻
  deletedAt    DateTime?                     // 論理削除 (US-039 不適切投稿削除)
  deleteReason String?                       // 削除理由 (Admin のみ閲覧)
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  submitter    User        @relation(fields: [submitterId], references: [id])
  cycle        Cycle       @relation(fields: [cycleId], references: [id])
  attachments  IdeaAttachment[]
  scores       Score[]

  @@index([cycleId, status])
  @@index([submitterId])
}

enum IdeaStatus {
  DRAFT
  PUBLISHED
  DELETED
}

model IdeaAttachment {
  id          String   @id @default(cuid())
  ideaId      String
  filename    String                     // 元ファイル名
  storedPath  String                     // uploads/{cuid}/{filename}
  mimeType    String                     // image/png, image/jpeg のみ
  sizeBytes   Int                        // バイト数 (上限 5MB)
  createdAt   DateTime @default(now())
  idea        Idea     @relation(fields: [ideaId], references: [id], onDelete: Cascade)
  @@index([ideaId])
}
```

**論点**:
- 「匿名」は API レベルで `submitter_id` を返さない設計。DB には常に保持。
- 添付は別テーブル (1 Idea : N Attachment)。1 Idea あたり最大 5 添付。

[Answer]: A

---

### Q6. Score テーブル設計（Domain Model — 最重要）

**問**: 3 軸スコアの保存方式は？

- **A. 1 行 = 1 (panel × idea) / 3軸を別カラム (推奨)**:
  ```prisma
  model Score {
    feasibility Int
    impact      Int
    innovation  Int
    ...
  }
  ```
  クエリが速い、型安全、SQL 集計が簡単。
- **B. 1 行 = 1 (panel × idea × axis) / 軸を行で分ける**:
  ```prisma
  model Score {
    axis  ScoreAxis  // FEASIBILITY | IMPACT | INNOVATION
    value Int
    ...
  }
  ```
  軸数の追加に強いが、3 軸固定 (FR-4.1) なので過剰設計。

**AI 推奨**: **A**。理由: 3 軸は要件で固定 (FR-4.1)、集計・JOIN がシンプル、平均計算が SQL で容易。

**AI 推奨スキーマ**:
```prisma
model Score {
  id           String      @id @default(cuid())
  panelId      String                        // パネルメンバー (User.id, role=PANEL)
  ideaId       String
  cycleId      String                        // 冗長だが集計効率のため保持
  feasibility  Int                           // 1〜5 (FR-4.2)
  impact       Int                           // 1〜5
  innovation   Int                           // 1〜5
  comment      String?     @db.Text          // 任意 (FR-4.4)
  status       ScoreStatus @default(DRAFT)   // DRAFT | CONFIRMED
  confirmedAt  DateTime?                     // 確定時刻 (US-022)
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  panel        User        @relation(fields: [panelId], references: [id])
  idea         Idea        @relation(fields: [ideaId], references: [id])
  cycle        Cycle       @relation(fields: [cycleId], references: [id])

  @@unique([panelId, ideaId])              // 1 パネルメンバー × 1 アイデア = 1 スコア
  @@index([cycleId, status])
  @@index([ideaId])
}

enum ScoreStatus {
  DRAFT
  CONFIRMED
}
```

**論点**:
- スコア値範囲は DB 制約 (`@db.SmallInt` + アプリ側バリデーション 1-5) で守る。
- 1 (panel, idea) = 1 score の一意制約 (`@@unique([panelId, ideaId])`)。
- `cycleId` は冗長だがダッシュボード集計の効率化のため保持。

[Answer]: A

---

### Q7. Cycle テーブル設計（Domain Model）

**問**: Cycle のフィールド構成は？

**AI 推奨スキーマ**:
```prisma
model Cycle {
  id           String      @id @default(cuid())
  name         String                        // "2026年5月サイクル" 等
  status       CycleStatus @default(OPEN)    // OPEN | CLOSED
  startsAt     DateTime                      // 評価開始
  endsAt       DateTime                      // 評価終了 (Admin 操作で変更可能)
  closedAt     DateTime?                     // 終了処理実施時刻
  top3IdeaIds  Json?                         // 終了時の上位3 IdeaId 配列 (CLOSED 移行時に確定)
  createdById  String                        // 作成 Admin
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  ideas        Idea[]
  scores       Score[]

  @@index([status])
}

enum CycleStatus {
  OPEN
  CLOSED
}
```

- **A.** AI 推奨で確定
- **B.** 修正したい

**論点**:
- 同時に OPEN な Cycle は **1 つだけ** という制約はアプリ側で実装 (US-036)。DB 制約では難しいため。
- `top3IdeaIds` は JSON で保存（順位情報含む）。型: `[{rank: 1, ideaId: "..."}, {rank: 2, ...}, {rank: 3, ...}]`。
- 「同点処理」は要件で明示なし → 単純な総合スコア降順、同点はランダム順序とする（後で Q9 で確認）。

[Answer]: A

---

### Q8. AuditLog テーブル設計（Business Rules）

**問**: 監査ログにはどのイベントを記録しますか？要件 NFR-2 / NFR-7 で必要性は推測可能。

- **A. 主要イベントのみ**: 認証 (login/logout) / Idea (publish/delete) / Score (confirm) / Cycle (create/close) / 権限変更 (role 変更)
- **B. 全 Write 操作**: あらゆる Create/Update/Delete を記録 (運用負荷高)
- **C. 監査ログ機能なし**: PoC では省略

**AI 推奨**: **A**。理由: PoC でも基本的な操作トレースは欲しい、Cycle 終了処理など重要操作の証跡が必要。

**AI 推奨スキーマ**:
```prisma
model AuditLog {
  id         String      @id @default(cuid())
  userId     String?                        // 操作者 (匿名アクションでは null)
  action     String                         // "USER_LOGIN" | "IDEA_PUBLISH" | "IDEA_DELETE" | "SCORE_CONFIRM" | "CYCLE_CREATE" | "CYCLE_CLOSE" | "ROLE_CHANGE"
  targetType String?                        // "Idea" | "Score" | "Cycle" | "User"
  targetId   String?
  metadata   Json?                          // 追加情報 (削除理由、変更前後 role 等)
  createdAt  DateTime    @default(now())

  @@index([userId, createdAt])
  @@index([action, createdAt])
}
```

[Answer]: A

---

### Q9. 同点・端数・集計ロジック（Business Rules）

**問**: 集計時の細部ルールを確定します。

| 項目 | 内容 | AI 推奨 |
|---|---|---|
| **平均計算** | スコアの平均は何桁? | **小数点以下 2 桁** (FR-6.1 で明示) |
| **総合スコア** | 3 軸の合計 or 平均? | **両方計算し UI で両表示** (FR-6.1 注釈) |
| **同点処理 (上位3決定時)** | 総合スコア同点の場合 | **作成日時の昇順 (先に投稿された方が上位)** |
| **未評価アイデア** | 評価がゼロのアイデア | **総合スコア = 0 として扱う、リーダーボード末尾** |
| **部分評価** | 一部パネルのみスコア提出 | **暫定スコア表示 + "N人/M人完了" 表示** (FR-6.3) |
| **削除済アイデア** | DELETED status のアイデア | **集計対象外** |
| **未確定スコア (DRAFT)** | パネルの DRAFT スコア | **集計対象外、CONFIRMED のみ** |

- **A.** 全 AI 推奨で確定
- **B.** 部分修正したい

[Answer]: A

---

### Q10. 入力バリデーション戦略（Business Rules）

**問**: バリデーションライブラリと統一エラー形式は？

- **A. class-validator + class-transformer (NestJS 標準推奨)**: DTO クラスにデコレーターで宣言、ValidationPipe で自動適用、Swagger 連携あり。
- **B. zod**: スキーマファースト、TypeScript 型推論強力だが NestJS との統合に追加 wrapper 必要。
- **C. joi / yup**: レガシー寄り、NestJS との統合は B より弱い。

**AI 推奨**: **A**。理由: NestJS 標準、Swagger 自動生成 (`@ApiProperty`) と統合、PoC で過剰選択は避ける。

**統一エラーレスポンス形式 (AI 推奨)**:
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": ["title must be longer than or equal to 1 characters"],
  "code": "VALIDATION_ERROR",
  "timestamp": "2026-05-05T10:00:00Z",
  "path": "/api/ideas/draft"
}
```

NestJS の `ValidationPipe` + 共通 `HttpExceptionFilter` (U0 提供) で実装。

[Answer]: A

---

### Q11. SSE Event Taxonomy（Integration Points）

**問**: SSE で配信するイベント一覧 (AI 推奨):

| Event Name | Publisher | Subscriber | Payload |
|---|---|---|---|
| `idea.published` | U2 | U4 (Dashboard) | `{ ideaId, cycleId, publishedAt }` |
| `score.confirmed` | U3 | U4 (Dashboard) | `{ ideaId, cycleId, panelId }`（panelId は Admin 以外に配信時マスク） |
| `cycle.closed` | U6 | U4, U5 | `{ cycleId, top3: [{rank, ideaId}, ...] }` |
| `idea.deleted` | U6 | U4 | `{ ideaId, cycleId }` |

**SSE エンドポイント**: `GET /api/events?topics=idea.published,score.confirmed,...`
- 認証必須 (JWT クエリパラメータ or Cookie)
- 全イベント購読 or トピック指定購読
- 接続維持 + heartbeat (15秒ごと `: ping`)

- **A.** AI 推奨で確定
- **B.** 修正したい

[Answer]: A

---

### Q12. Logger / 構造化ログ（Integration Points）

**問**: ログ形式は？

- **A. JSON 構造化ログ (pino + nestjs-pino)**: 高性能、構造化、運用ツール連携容易。
- **B. NestJS 標準 Logger (テキスト)**: シンプルだが構造化なし。
- **C. Winston (テキスト or JSON)**: 柔軟だが pino より遅い。

**AI 推奨**: **A**。理由: PoC でも構造化ログは観測性で大事、pino は最速、Audit との分離（Audit はビジネスイベント、Logger は技術ログ）で運用しやすい。

**ログレベル**: `info` (デフォルト) / `debug` (開発環境) / `error` (例外時)。
**ログフォーマット例**:
```json
{"level":"info","time":1683000000000,"context":"AuthController","msg":"login","userId":"clxyz...","ip":"127.0.0.1"}
```

[Answer]: A

---

### Q13. FE 共通基盤コンポーネント（Frontend Components）

**問**: U0 が提供する Frontend 共通基盤の構成は？

**AI 推奨**:
- `app/layout.tsx`: RootLayout (HTML / Body / フォント / Tailwind / AuthProvider / Toaster)
- `components/shared/Navigation.tsx`: 共通ナビゲーション (各ユニットがメニュー項目を `nav.config.ts` で declarative 提供)
- `components/shared/Sidebar.tsx`: 認証済みユーザー用サイドバー (Admin/Panel/Submitter ロール条件分岐)
- `components/shared/Header.tsx`: ヘッダー (ユーザー名 / ログアウトボタン)
- `components/shared/AuthGuard.tsx`: 認証必須ページのラッパー (未ログイン → /auth/login へリダイレクト)
- `components/shared/RoleGuard.tsx`: ロール必須ページのラッパー
- `lib/api-client.ts`: axios + JWT interceptor + 401 → refresh 自動 retry
- `lib/sse-client.ts`: EventSource ラッパー + 自動再接続
- `hooks/useAuth.ts`: 認証状態 / ログイン / ログアウト / current user
- `hooks/useSSE.ts`: SSE 購読フック
- `contexts/AuthContext.tsx`: 認証状態の React Context

**ライブラリ選定**:
- UI: **Tailwind CSS + shadcn/ui** (rapid prototyping, Tailwind の utility class とコンポーネントの両方)
- フォーム: **React Hook Form + zod** (FE 側のバリデーション、BE は class-validator なので両者で同じルール定義が必要)
- 状態管理: **React Context のみ** (Redux/Zustand 不要、規模 100 ユーザー)
- データ取得: **TanStack Query (React Query)** (キャッシュ・SSE と組み合わせて再フェッチ)
- アイコン: **lucide-react**

- **A.** AI 推奨で確定
- **B.** 部分修正したい

[Answer]: A

---

### Q14. Health Check / ヘルスエンドポイント（Integration Points）

**問**: ヘルスチェック仕様:

**AI 推奨**:
- `GET /health` — 200 OK (アプリ起動確認のみ、認証不要)
- `GET /health/db` — 200 OK (DB 接続確認、認証不要)
- `GET /health/ready` — 全依存 (DB) チェック後に 200 (k8s readiness 風)

`@nestjs/terminus` を利用、Docker Compose の HEALTHCHECK で利用。

[Answer]: A (推奨で確定)

---

## 2. 生成成果物（回答受領後に作成）

- [ ] `aidlc-docs/construction/u0-shared-foundation/functional-design/business-logic-model.md`
  - 主要ビジネスフロー (Cycle ライフサイクル / Score 集計ロジック / 認証フロー / SSE Pub/Sub フロー)
- [ ] `aidlc-docs/construction/u0-shared-foundation/functional-design/business-rules.md`
  - 集計ルール (Q9 確定値) / バリデーションルール / 認可ルール / Cycle 制約 (1つだけ OPEN 等)
- [ ] `aidlc-docs/construction/u0-shared-foundation/functional-design/domain-entities.md`
  - 全 Prisma エンティティの ER 図 + フィールド詳細 + リレーション + 制約
- [ ] `aidlc-docs/construction/u0-shared-foundation/functional-design/frontend-components.md`
  - Q13 確定の FE 共通基盤コンポーネント階層 + Props/State + 利用 hooks

## 3. 完了基準

- [x] functional-design-plan.md 生成（本ファイル）
- [ ] Q1〜Q14 の `[Answer]:` 全部記入
- [ ] 曖昧性チェック完了
- [ ] 4 成果物生成完了
- [ ] ユーザーが Functional Design を承認

---

## 📋 ユーザーアクション

**Q1〜Q14 を確認してください。** AI 推奨が `[Answer]:` に既に記入済みです。

- そのままで良ければ **"approve"** または "OK" と返答 → 4 成果物生成
- 修正したい質問があれば、該当 Q 番号と値を返してください（例: `Q4=B, Q12=B`）
