# Unit of Work Definitions — Ideation Portal

**Date**: 2026-05-05
**Status**: Generated (PART 2)
**Source**: `unit-of-work-plan.md` (Q1〜Q10 確定値) + `application-design.md` + `stories.md`

---

## 1. ユニット数とデプロイモデル（Q1=A / Q4=B）

- **デプロイ単位**: 3 Docker コンテナ (`frontend` / `backend` / `db`) — モノリス
- **論理ユニット数**: **7**（U0〜U6）
  - U0 = Shared Foundation（横断技術ユニット、ストーリー直接マップなし）
  - U1〜U6 = ビジネス機能ユニット（Epic 1対1、各ユニットが垂直スライス FE+BE）
- **物理プロジェクト構造**: 単一 Monorepo（`frontend/` + `backend/` + `prisma/` + `docker-compose.yml`）

---

## 2. ユニット定義一覧

### U0. Shared Foundation（横断基盤ユニット）

| 項目 | 内容 |
|---|---|
| **責務** | Backend / Frontend 横断の技術基盤を提供。各ユニットが安心して機能実装に集中できる土台。 |
| **担当 Backend Module** | PrismaModule / CommonModule(DTO/Exception/Validation/Guard 基盤) / LoggerModule / AuditModule / SseHubModule / HealthModule |
| **担当 Frontend** | RootLayout / AuthContext Provider / 共通 Navigation 骨格 (各ユニットが項目を提供する仕組み) / API client (axios + JWT interceptor) / SSE client / 共通 hooks (useAuth, useSSE) / Tailwind 基盤 |
| **DB Schema** | Prisma Schema 全体定義（全ユニット共有） / マイグレーション基盤 |
| **担当 Story** | なし（技術基盤のみ） |
| **依存** | なし（全ての起点） |
| **被依存** | U1〜U6 全て |
| **完了基準** | Prisma Schema 全テーブル定義 / JWT Guard / 共通 ExceptionFilter / SSE Hub の Pub/Sub 動作 / FE 共通レイアウト / Docker Compose 起動確認 |
| **想定ファイル数** | Backend ~25, Frontend ~15, Prisma ~1 (schema.prisma) |

### U1. Authentication & User Management（EP-AUTH）

| 項目 | 内容 |
|---|---|
| **責務** | アカウント登録・ログイン・パスワードリセット・ログアウト・パネル任命/解除・ロール別ナビゲーション項目提供 |
| **担当 Backend Module** | AuthModule / UsersModule |
| **担当 Frontend** | `/auth/register` / `/auth/login` / `/auth/forgot-password` / `/auth/reset-password` / `/profile` / Navigation の Auth 連動部分（各ロール用メニュー項目提供） |
| **DB Tables** | User / RefreshToken / PasswordResetToken |
| **担当 Story** | US-001〜US-006 (6 件、内 US-007 は U0) |
| **依存** | U0 (PrismaModule / SSE / Common) |
| **被依存** | U2〜U6（全機能で認証・ロールガード必要） |
| **完了基準** | 登録〜ログイン〜ロール変更〜ログアウトの一連動作、JWT 発行/検証、パネル任命 API |
| **Story Counts** | Must=4 / Should=2 / Could=0 |

### U6. Admin & Cycle Management（EP-ADMIN — 実装順 #3）

| 項目 | 内容 |
|---|---|
| **責務** | 評価サイクルのライフサイクル管理（作成/終了/集計/上位3決定/匿名解除）、パネル一覧管理画面、不適切投稿削除、メトリクス、アーカイブ |
| **担当 Backend Module** | AdminModule / CyclesModule |
| **担当 Frontend** | `/admin/cycles` / `/admin/cycles/[id]` / `/admin/panel` / `/admin/ideas` (削除 UI) / `/admin/metrics` / `/admin/archive` |
| **DB Tables** | Cycle / AuditLog（CommonAudit からの利用） |
| **担当 Story** | US-031, US-032, US-033, US-036, US-037, US-038, US-039, US-040, US-041 (9 件) |
| **依存** | U0 / U1 (UserService) |
| **被依存** | U2 (Cycle 状態判定) / U3 (Cycle OPEN チェック) / U4 (Cycle 別ランキング) / U5 (Cycle 結果ビュー) |
| **完了基準** | Cycle CRUD / Cycle 終了処理（集計→上位3決定→匿名解除→トランザクション）/ Admin 各画面 |
| **Story Counts** | Must=5 / Should=3 / Could=1 |
| **特記** | Q5=A により Cycle 全体所有。`CycleService.assertOpen()` / `CycleService.findActive()` 等の薄い API を他ユニットに公開 |

### U2. Idea Submission（EP-SUBMIT — 実装順 #4）

| 項目 | 内容 |
|---|---|
| **責務** | アイデア新規作成 / ドラフト自動・手動保存 / 画像添付 / ドラフト一覧 / 公開 / 自分の投稿一覧 / 投稿後編集不可 / バリデーション |
| **担当 Backend Module** | IdeasModule |
| **担当 Frontend** | `/ideas/new` / `/ideas/drafts` / `/ideas/drafts/[id]/edit` / `/ideas/my` / 画像アップロード UI |
| **DB Tables** | Idea / IdeaAttachment / IdeaDraft (or status カラムで統合) |
| **担当 Story** | US-008〜US-016 (9 件) |
| **依存** | U0 (Common/Prisma/SSE) / U1 (UserService - 投稿者ID) / U6 (CycleService - 現在 Cycle に紐付け) |
| **被依存** | U3 (評価対象データ) / U4 (Dashboard 表示) / U5 (殿堂表示) / U6 (削除対象) |
| **完了基準** | ドラフト作成→自動保存→画像添付→公開→編集不可、自分の投稿一覧表示 |
| **Story Counts** | Must=8 / Should=1 / Could=0 |
| **特記** | 画像保存先: ローカル FS (`uploads/`)。公開時 SSE で Dashboard 更新 trigger。 |

### U3. Evaluation & Scoring（EP-EVAL — 実装順 #5）

| 項目 | 内容 |
|---|---|
| **責務** | 評価対象アイデア一覧 / 詳細閲覧（匿名）/ 3軸スコア入力 / コメント / スコア修正 / 評価確定 / 並行評価ダッシュボード / 他パネルスコア非公開 |
| **担当 Backend Module** | EvaluationsModule |
| **担当 Frontend** | `/evaluate` / `/evaluate/[ideaId]` / `/evaluate/dashboard` (パネル個人用進捗) |
| **DB Tables** | Score / ScoreComment |
| **担当 Story** | US-017〜US-024 (8 件) |
| **依存** | U0 / U1 (Panel ロールガード) / U2 (IdeaService - 対象一覧) / U6 (CycleService - OPEN 確認) |
| **被依存** | U4 (集計済みスコアの表示) / U5 (上位3決定の元データ) / U6 (Cycle 終了時の集計対象) |
| **完了基準** | 評価対象 → スコア入力 → コメント → 確定 → 修正可（Cycle OPEN 中）。他パネルスコア非公開（API レベルでガード） |
| **Story Counts** | Must=6 / Should=2 / Could=0 |
| **特記** | 投稿者匿名化は Idea 取得時に `submitter_id` を返さない API 設計（Cycle 終了で公開）。 |

### U4. Dashboard & Analytics（EP-DASH — 実装順 #6）

| 項目 | 内容 |
|---|---|
| **責務** | 全アイデアリーダーボード / 軸別ランキング / 詳細ページ / 投稿状況・評価進捗 / 準リアルタイム更新 / ディメンション別比較 |
| **担当 Backend Module** | DashboardModule |
| **担当 Frontend** | `/dashboard` / `/dashboard/by-axis/[axis]` / `/ideas/[id]` (詳細ページ) / `/dashboard/progress` / `/dashboard/compare` |
| **DB Tables** | （読み取り専用、自前テーブル無し。集計ビュー or オンザフライ集計） |
| **担当 Story** | US-025〜US-030 (6 件) |
| **依存** | U0 (SSE Hub) / U1 / U2 (IdeaService) / U3 (集計済みスコア) / U6 (CycleService) |
| **被依存** | U5 (殿堂ページが詳細ページ参照) |
| **完了基準** | リーダーボード / 軸別 / 詳細 / 進捗ビュー / SSE 経由の準リアルタイム更新（5秒以内） |
| **Story Counts** | Must=3 / Should=3 / Could=0 |
| **特記** | US-027 (アイデア詳細ページ) を Q8=A により U4 に配置（投稿後の Eval 状態・公開後の表示も含むため Dashboard 文脈）。 |

### U5. Recognition & Hall of Fame（EP-REC — 実装順 #7）

| 項目 | 内容 |
|---|---|
| **責務** | 表彰殿堂ページ / 殿堂履歴 / 上位3名表示（U6 が決定したデータの読み取りビュー） |
| **担当 Backend Module** | RecognitionModule |
| **担当 Frontend** | `/recognition` (現サイクル殿堂) / `/recognition/history` / `/recognition/[cycleId]` |
| **DB Tables** | （Cycle と Idea の JOIN による読み取りビュー） |
| **担当 Story** | US-034, US-035 (2 件のみ — US-031〜US-033 は U6 所有) |
| **依存** | U0 / U1 / U2 (IdeaService) / U6 (CycleService - 確定済み Cycle のみ表示) |
| **被依存** | なし |
| **完了基準** | 現サイクル殿堂表示 / 履歴 / 過去 Cycle 詳細 |
| **Story Counts** | Must=1 / Should=1 / Could=0 |
| **特記** | U5 は読み取り専用ビュー。書き込み (上位3決定 / 氏名公開) は U6 の Cycle 終了処理で完結。 |

---

## 3. ユニット実装順序（Q7=C 依存最小順）

```
U0 (Shared Foundation)  [基盤・先行必須]
   ↓
U1 (Auth & Users)        [全機能の前提]
   ↓
U6 (Admin & Cycles)      [Cycle 状態を後続が参照するため早期]
   ↓
U2 (Idea Submission)     [Cycle 紐付け必要]
   ↓
U3 (Evaluation)          [Idea 必要]
   ↓
U4 (Dashboard)           [Score 集計必要]
   ↓
U5 (Recognition)         [Cycle 確定後の読み取り]
```

各ユニット完了 = Unit Test 80% カバレッジ達成（Q10=C）。Integration / E2E は Build and Test ステージで一括。

---

## 4. Story Count サマリ

| Unit | Epic | Stories | Must | Should | Could |
|---|---|---|---|---|---|
| U0 | (横断) | 0 | 0 | 0 | 0 |
| U1 | EP-AUTH | 6 (US-007 除く) | 4 | 2 | 0 |
| U2 | EP-SUBMIT | 9 | 8 | 1 | 0 |
| U3 | EP-EVAL | 8 | 6 | 2 | 0 |
| U4 | EP-DASH | 6 + 1 (US-027) | 4 | 3 | 0 |
| U5 | EP-REC | 2 (US-034, US-035) | 1 | 1 | 0 |
| U6 | EP-ADMIN | 9 (US-031〜033 + US-036〜041) | 6 | 2 | 1 |
| **計** | — | **41** (US-029=U0, US-007=U0) | **29** | **11** | **1** |

**注**: US-007 (ロール別ナビ), US-029 (準リアルタイム更新 SSE Hub) は Q8=A により U0 に配置。Story Count では U0=2 と数えても良いが、便宜上 U1/U4 から減じて U0 に加算した形で集計するか、U0=技術ユニットとして集計外にするか実装ポリシー次第。

---

## 5. コード組織戦略（Q1=A モノリス + Q3=B 垂直スライス）

```
ai-dlc-demo/
├── docker-compose.yml             # frontend / backend / db
├── README.md
├── .env.example
│
├── prisma/                        # U0 所有
│   ├── schema.prisma              # 全ユニット共有スキーマ
│   ├── migrations/
│   └── seed.ts
│
├── backend/                       # NestJS モノリス
│   ├── package.json
│   ├── tsconfig.json
│   ├── nest-cli.json
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   │
│   │   ├── shared/                # U0 - Shared Foundation
│   │   │   ├── prisma/
│   │   │   ├── common/            # DTO base / Exception / Validation
│   │   │   ├── logger/
│   │   │   ├── audit/
│   │   │   ├── sse/               # SSE Hub
│   │   │   └── health/
│   │   │
│   │   ├── auth/                  # U1
│   │   ├── users/                 # U1
│   │   ├── ideas/                 # U2
│   │   ├── evaluations/           # U3
│   │   ├── dashboard/             # U4
│   │   ├── recognition/           # U5
│   │   ├── cycles/                # U6
│   │   └── admin/                 # U6
│   ├── test/                      # e2e (Build and Test ステージで作成)
│   └── uploads/                   # U2 - 画像保存先 (Q5=A ローカル FS)
│
├── frontend/                      # Next.js モノリス
│   ├── package.json
│   ├── next.config.ts
│   ├── tsconfig.json
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx         # U0
│   │   │   ├── page.tsx
│   │   │   ├── auth/              # U1
│   │   │   ├── ideas/             # U2 (一部 U4 詳細ページも含む可)
│   │   │   ├── evaluate/          # U3
│   │   │   ├── dashboard/         # U4
│   │   │   ├── recognition/       # U5
│   │   │   └── admin/             # U6
│   │   ├── components/
│   │   │   ├── shared/            # U0 - Layout / Nav / etc.
│   │   │   └── {unit}/            # ユニット別コンポーネント
│   │   ├── lib/                   # U0 - api client / sse client / hooks
│   │   ├── hooks/
│   │   └── types/
│   └── public/
│
└── aidlc-docs/                    # ドキュメント (本リポジトリの設計成果物)
```

**Critical Rules**:
- Application Code は workspace root 配下（`backend/`, `frontend/`, `prisma/`）。`aidlc-docs/` には絶対に配置しない
- Construction の per-unit ループでは、各ユニットが上記ディレクトリの担当部分のみを生成・更新
- `prisma/schema.prisma` は U0 で全ユニット分のテーブルを定義してしまう（垂直スライスでも DB スキーマは集中管理）

---

## 6. ユニット完了の定義（Q10=C）

各ユニット (U0〜U6) で per-unit ループ完了時に満たすべき条件:

- [ ] 担当 Story の AC 全て達成（コード実装 + 該当 UI ページ動作）
- [ ] Unit Test カバレッジ 80% 以上 (Service / Controller / Repository 各層 + Frontend Component / Hook)
- [ ] FunctionalDesign / NFR Requirements / NFR Design / CodeGen の per-unit 成果物完備
- [ ] ESLint / Prettier / TypeScript strict pass
- [ ] Build 成功（`npm run build` for FE / `npm run build` for BE）

**Integration Test / E2E Test / Performance Test は Build and Test ステージで全ユニット完了後に一括実施。**
