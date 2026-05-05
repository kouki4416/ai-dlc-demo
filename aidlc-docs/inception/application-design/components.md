# Components — Ideation Portal

**Date**: 2026-05-03
**Architecture**: NestJS Standard Layered (Controller → Service → Repository) × Prisma × MySQL
**API**: REST + OpenAPI (Swagger)
**Auth**: JWT (Access + Refresh Token)
**Realtime**: SSE
**Source**: `requirements.md` + `stories.md` + `application-design-plan.md`

---

## バックエンド構成（NestJS Feature Modules）

### C1. AuthModule
- **Purpose**: ログイン認証 / JWT 発行・更新 / Guards
- **Responsibilities**:
  - メール+パスワードのログイン処理
  - Access Token / Refresh Token の発行・リフレッシュ
  - JWT 検証用 `JwtAuthGuard` / `RolesGuard` の提供
  - パスワードハッシュ検証
- **Interfaces (REST)**:
  - `POST /auth/login` — ログイン
  - `POST /auth/refresh` — Refresh Token でアクセストークン再発行
  - `POST /auth/logout` — Refresh Token 無効化

### C2. UsersModule
- **Purpose**: ユーザー登録・ロール管理
- **Responsibilities**:
  - 新規ユーザー登録 + パスワードハッシュ化（bcrypt）
  - パスワードリセット（仮想：画面表示のみ、メール送信なし）
  - ロール変更（Admin → Panel 任命/解除）
- **Interfaces (REST)**:
  - `POST /users` — 新規登録
  - `GET /users/me` — 自分のプロフィール取得
  - `POST /users/password-reset/request` — リセットトークン発行
  - `POST /users/password-reset/confirm` — リセット確定
  - `PATCH /users/:id/role` — ロール変更（Admin のみ）

### C3. IdeasModule
- **Purpose**: アイデア投稿・ドラフト管理・添付管理
- **Responsibilities**:
  - ドラフト作成・自動保存・手動保存・公開
  - 投稿者本人のドラフト/公開済み一覧
  - 公開済みアイデアの匿名表示制御（FR-3）
  - 公開後の編集ロック（FR-2.5）
- **Interfaces (REST)**:
  - `POST /ideas` — 新規ドラフト作成
  - `GET /ideas` — 公開済みアイデア一覧（匿名／状況に応じた氏名表示）
  - `GET /ideas/:id` — アイデア詳細
  - `GET /ideas/me/drafts` — 自分のドラフト一覧
  - `GET /ideas/me/published` — 自分の公開済み一覧
  - `PATCH /ideas/:id` — ドラフト更新（公開前のみ）
  - `POST /ideas/:id/publish` — 公開化
  - `POST /ideas/:id/attachments` — 画像添付（multipart）
  - `DELETE /ideas/:id/attachments/:attachmentId` — 添付削除

### C4. EvaluationsModule
- **Purpose**: 評価・スコアリング・パネル独立性の維持
- **Responsibilities**:
  - 3軸スコア（Feasibility/Impact/Innovation）入力・修正・確定
  - コメント任意付与
  - 評価独立性ガード（FR-5: 自分以外の Panel スコアは非表示）
  - 自身投稿の評価不可制御（FR-3.4 関連）
- **Interfaces (REST)**:
  - `GET /evaluations/queue` — 自分のキュー（評価ステータス付き一覧）
  - `GET /evaluations/idea/:ideaId` — そのアイデアに対する自分のスコア取得
  - `POST /evaluations/idea/:ideaId/draft` — スコア下書き保存（部分更新可）
  - `POST /evaluations/idea/:ideaId/finalize` — 評価確定
  - `GET /evaluations/idea/:ideaId/details` — 詳細スコア（Admin / 投稿者本人 / 評価期間終了後のみ）

### C5. CyclesModule
- **Purpose**: 評価サイクル運用と上位3決定・匿名性解除
- **Responsibilities**:
  - サイクル作成・終了・期間管理
  - 集計確定（パネル平均、3軸平均、総合スコア計算）
  - 上位3アイデアの自動決定とタイブレーク（Innovation スコア優先）
  - 上位3投稿者の匿名性解除トリガー
  - 中間状態（N/M完了）の集計提供
- **Interfaces (REST)**:
  - `POST /cycles` — 新規サイクル作成（Admin のみ）
  - `GET /cycles` — サイクル一覧
  - `GET /cycles/active` — アクティブサイクル取得
  - `POST /cycles/:id/close` — サイクル終了処理（Admin のみ、集計確定 + 上位3確定 + 氏名公開）
  - `GET /cycles/:id/winners` — 上位3取得

### C6. DashboardModule
- **Purpose**: リーダーボード・ダッシュボード・準リアルタイム配信
- **Responsibilities**:
  - 総合スコア順リーダーボード提供
  - 軸別ランキング提供
  - サマリ（投稿数・評価進捗）提供
  - SSE で更新イベント配信
  - ディメンション別比較ビュー
- **Interfaces (REST + SSE)**:
  - `GET /dashboard/leaderboard?dimension=overall|feasibility|impact|innovation` — ランキング
  - `GET /dashboard/summary` — サマリ統計
  - `GET /dashboard/comparison` — ディメンション別比較
  - `GET /dashboard/stream` — SSE エンドポイント（text/event-stream）

### C7. RecognitionModule
- **Purpose**: 殿堂（Hall of Fame）表示
- **Responsibilities**:
  - 終了済みサイクルの上位3表示
  - 過去サイクル履歴
- **Interfaces (REST)**:
  - `GET /recognition/current` — 直近殿堂
  - `GET /recognition/history` — 過去履歴

### C8. AdminModule
- **Purpose**: 管理者向け機能（パネル管理・削除・メトリクス・監査）
- **Responsibilities**:
  - パネル一覧・任命・解除（UsersModule と連携）
  - 不適切投稿削除 + 監査ログ
  - アーカイブデータ閲覧
  - 管理メトリクス（総投稿数・評価進捗率・スコア分布）
- **Interfaces (REST)**:
  - `GET /admin/panel-members` — パネル一覧
  - `GET /admin/users?role=submitter` — 任命候補一覧
  - `DELETE /admin/ideas/:id` — 投稿削除（理由必須）
  - `GET /admin/archives` — アーカイブ一覧
  - `GET /admin/metrics` — メトリクス取得
  - `GET /admin/audit-log` — 監査ログ

### Shared Modules

#### S1. PrismaModule
- **Purpose**: Prisma Client のシングルトン提供 + ライフサイクル管理
- **Responsibilities**: DB 接続、トランザクション管理、ロギング

#### S2. CommonModule
- **Purpose**: 共通 DTO / 例外 / インターセプタ / ヘルパー
- **Responsibilities**: ApiResponse 統一形式、グローバル例外フィルタ、Validation Pipe 設定、CurrentUser デコレータ

---

## フロントエンド構成（Next.js App Router）

### F1. (auth) — 認証関連ルートグループ
- `/login`, `/register`, `/password-reset` — ログイン/登録/リセットページ
- 公開ルート（未認証ユーザーのみアクセス可）

### F2. (app) — 認証必須ルートグループ
- `/` — ロール別ホーム（リーダーボード等）
- `/ideas/new` — 新規投稿フォーム（Submitter）
- `/ideas/[id]` — アイデア詳細（読み取り、評価期間中は匿名）
- `/ideas/me` — 自分の投稿一覧（Submitter）
- `/dashboard` — リーダーボード/分析（全ユーザー）
- `/recognition` — 殿堂（全ユーザー）

### F3. (panel) — Panel 専用ルートグループ
- `/panel/queue` — 評価キュー
- `/panel/evaluate/[ideaId]` — 評価画面（複数タブ切替対応）

### F4. (admin) — Admin 専用ルートグループ
- `/admin` — Admin ダッシュボード
- `/admin/cycles` — サイクル管理
- `/admin/panel` — パネル管理
- `/admin/ideas` — 投稿管理（削除等）
- `/admin/metrics` — メトリクス
- `/admin/archives` — アーカイブ閲覧

### F5. Shared Components & Lib
- **lib/api-client.ts**: REST クライアント（fetch ベース、JWT 自動付与、リフレッシュ自動）
- **lib/auth-context.tsx**: 認証コンテキスト
- **lib/sse-client.ts**: SSE 接続管理
- **components/ui/**: 汎用 UI（Form, Input, Button, Card, Chart 等）
- **components/idea/**: アイデア表示コンポーネント
- **components/score/**: スコア表示（レーダーチャート / バー）

---

## コンポーネント概要マッピング

| Component | 主担当 Epic | 関与 Persona | 主要 NFR |
|---|---|---|---|
| AuthModule | EP-AUTH | 全ロール | NFR-2.2 (ハッシュ化), NFR-2.4 (CSRF/XSS) |
| UsersModule | EP-AUTH / EP-ADMIN | 全ロール / Admin | NFR-2.5 (RBAC) |
| IdeasModule | EP-SUBMIT | SUB | NFR-1.2 (ロード), NFR-5.2 (ドラフト信頼性) |
| EvaluationsModule | EP-EVAL | PNL | NFR-2.5 (独立性), NFR-1.3 (反映遅延) |
| CyclesModule | EP-REC / EP-ADMIN | ADM | NFR-2.5 (匿名性解除制御) |
| DashboardModule | EP-DASH | 全ロール | NFR-1.3 (準リアルタイム) |
| RecognitionModule | EP-REC | 全ロール | NFR-1.2 (ロード) |
| AdminModule | EP-ADMIN | ADM | NFR-2.5 (RBAC), 監査要件 |
