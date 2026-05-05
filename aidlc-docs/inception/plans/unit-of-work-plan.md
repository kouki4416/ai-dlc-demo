# Unit of Work Plan — Ideation Portal

**Date**: 2026-05-04
**Status**: ✅ Approved — All AI recommendations adopted (Q1〜Q10 確定 / PART 2 実行中)
**Source**: `requirements.md` + `stories.md` (41 stories / 6 Epics) + `application-design.md` (8 Feature Modules + 2 Shared Modules) + `execution-plan.md`

---

## 0. 前提コンテキスト（Application Design からの確定事項）

| 項目 | 確定値 |
|---|---|
| Stack | Next.js (App Router) + NestJS + MySQL 8.x + Prisma |
| アーキスタイル | Standard Layered (Controller → Service → Repository) |
| 認証 | JWT (Access + Refresh) |
| Realtime | SSE |
| 環境 | ローカル Docker Compose のみ |
| 規模 | 〜100ユーザー / 100同時接続 |
| Risk Level | Low |
| Stories | 41 stories / 6 Epics (EP-AUTH / EP-SUBMIT / EP-EVAL / EP-DASH / EP-REC / EP-ADMIN) |
| Backend Modules | AuthModule / UsersModule / IdeasModule / EvaluationsModule / CyclesModule / DashboardModule / RecognitionModule / AdminModule + (Shared) PrismaModule / CommonModule |
| 推奨ユニット数 | 6 (execution-plan.md より: U1 Auth, U2 Submission, U3 Evaluation, U4 Dashboard, U5 Recognition, U6 Admin) |

---

## 1. ユニット決定が必要な領域（質問）

各質問の `[Answer]:` タグに直接回答を記入してください（A/B/C 等の選択肢、または自由記述）。

---

### Q1. デプロイモデル（Code Organization — Greenfield multi-unit）

**問**: ローカル開発のみ、100ユーザー規模で、デプロイ単位（独立してビルド・起動できる成果物）はいくつ必要ですか？

- **A. 2デプロイ単位のモノリス**: Frontend (Next.js 1アプリ) + Backend (NestJS 1アプリ、8モジュール内蔵) + MySQL。Docker Compose で `frontend` / `backend` / `db` の3コンテナ。
- **B. 6マイクロサービス + Frontend**: U1〜U6 を NestJS の独立サービスとして分離し、Frontend が API Gateway 経由で各サービスを呼び出す。
- **C. 機能領域ごとに 2-3 サービスに集約**: 例: `auth-service` / `core-service` (投稿+評価+ダッシュボード+表彰) / `admin-service` + Frontend。

**AI 推奨**: **A**。理由:
1. 規模 〜100ユーザー / 100同時接続でモノリスで十分
2. ローカル開発 / 社内 PoC でマイクロサービスの運用負荷（DB 分割、サービス間通信、観測性）はオーバーキル
3. Docker Compose 起動の単純さを保てる
4. NestJS の Module 機能で論理境界は明確に保てる（後でマイクロサービス化する余地も残る）

[Answer]: A

---

### Q2. ユニット定義の粒度（Story Grouping）

**問**: 「Unit of Work」の粒度をどう定義しますか？Q1 で **A (モノリス)** を選んだ場合、Unit は「論理モジュール」となります。Q1 で **B/C** を選んだ場合、Unit は「独立デプロイサービス」となります。

- **A. Epic 1対1 で6ユニット**: U1=EP-AUTH, U2=EP-SUBMIT, U3=EP-EVAL, U4=EP-DASH, U5=EP-REC, U6=EP-ADMIN。execution-plan.md の推奨に従う。
- **B. ドメイン境界で5ユニット**: U1=Auth&Users, U2=Submission, U3=Evaluation, U4=Dashboard&Recognition (リードビュー統合), U5=Admin&Cycles (運用統合)。EP-REC と EP-DASH を統合し、EP-ADMIN は Cycles を吸収。
- **C. 4ユニット (粗粒度)**: U1=Auth&Users, U2=Submission&Evaluation (執筆+評価), U3=Dashboard&Recognition, U4=Admin&Cycles。
- **D. 8ユニット (細粒度)**: backend モジュール 1対1 (Auth / Users / Ideas / Evaluations / Cycles / Dashboard / Recognition / Admin)。
- **E. 自由記述**

**AI 推奨**: **A (6ユニット = Epic 1対1)**。理由:
1. ストーリーマッピングが直感的（1 Epic = 1 Unit）
2. 各ユニットに Must Story が 4-7 個ずつ配分され、サイズが均質
3. CONSTRUCTION の per-unit ループで FunctionalDesign / NFR / CodeGen を回しやすい
4. EP-REC と EP-ADMIN は Cycles の所有権で繋がるが、Cycle Service として共通化すれば独立性を保てる
5. EP-EVAL の独立性（他パネルスコア非公開）の境界が明確

[Answer]: A

---

### Q3. Frontend の扱い（Code Organization）

**問**: Next.js Frontend は Unit of Work として独立させますか、それとも各 Backend Unit の一部として扱いますか？

- **A. Frontend を 1つの独立ユニット (U0=Frontend) とし、計 7ユニット**: Backend 6 + Frontend 1。Frontend は全 Epic の UI を含む 1 Next.js アプリ。
- **B. Frontend を各 Backend Unit に分散**: U1 に Auth UI、U2 に Submit UI 等を含める。CONSTRUCTION 時に各ユニットで FE+BE 同時実装。
- **C. Frontend を Unit of Work から除外し、別途扱う**: 6ユニットは Backend のみ、Frontend は最後に別フェーズで一括実装。

**AI 推奨**: **B (各 Backend Unit に Frontend を分散)**。理由:
1. Next.js は 1 アプリで App Router の機能別ルートを各ユニットの担当領域として分割できる（`/auth/*` / `/ideas/*` / `/evaluate/*` / `/dashboard/*` / `/recognition/*` / `/admin/*`）
2. 1 ユニット = 1 Epic の縦割り実装で、FE+BE+DB を一気通貫で完成させられる（垂直スライス）
3. Code Generation 時に「ユニット完成 = この Epic のユーザー価値を提供できる状態」というクリアな完了基準が得られる
4. 独立した Frontend ユニットだと API 全部が揃うまで FE 実装が始められず、価値検証が遅れる

ただし以下の例外あり:
- 共通レイアウト / `RootLayout` / Auth Context Provider / Navigation 等の **共通 FE 基盤** は U1 (Auth) または別途 "Shared FE Foundation" として U1 に内包
- 共通 API client / SSE client / 共通 hooks は Shared レイヤーとして全ユニット共用（コードは `frontend/lib/` に集約）

[Answer]: B

---

### Q4. 共有モジュール / 横断的関心事の所属（Dependencies）

**問**: PrismaModule / CommonModule (Validation / DTO / Exception / Guard 基盤) と、Backend 共通の cross-cutting (Logger / Audit / SSE Hub / Health Check) はどのユニットに所属させますか？

- **A. U1 (Auth) に内包**: U1 は最初に実装される基盤ユニットでもあり、PrismaModule / CommonModule / Logger / Audit / Health を全て U1 のスコープに入れる。後続ユニットは U1 の成果物に依存する。
- **B. U0 (Shared Foundation) を新設**: 共有モジュールを独立した「ゼロ番ユニット」として最初に実装し、U1〜U6 はこれに依存する。
- **C. 各ユニットで個別実装し、後で共通化**: 各ユニットで都度 Prisma 呼び出し等を実装し、リファクタフェーズで共通化。

**AI 推奨**: **B (U0=Shared Foundation を新設、計 7ユニット)**。理由:
1. PrismaModule / Logger / Audit / Health / Common DTO は明確に横断的関心事で、U1 の責任範囲（Auth）と重ならない
2. Construction の最初の per-unit イテレーションで U0 を完成させれば、U1〜U6 は安心して同パターンを使える
3. Q3=B (Frontend 分散) と組み合わせると、U0 に「Shared FE Foundation (RootLayout / API client / SSE client / 共通 hooks)」も含められて整合する
4. 「Shared Foundation = 縦割りでないユニット」という性格が明示でき、ストーリーマップが綺麗（U0 にはユーザーストーリーが直接マップされない、技術タスクのみ）

トレードオフ: 「ユニット = ユーザー価値」というルールが厳格な場合は A の方が綺麗。ただし B にしても U0 は Cross-cutting Story (例: 認証ガード基盤、エラーハンドリング基盤) としてストーリー由来の根拠を持てる。

[Answer]: B

---

### Q5. Cycle (評価サイクル) の所有権（Business Domain）

**問**: 評価サイクル (Cycle) は EP-ADMIN (作成・終了) / EP-EVAL (評価期間判定) / EP-REC (上位3決定・匿名解除) の3 Epic にまたがります。Cycle ロジックの所有権はどのユニットに置きますか？

- **A. U6 (Admin) が Cycle 全体を所有**: Cycle の CRUD・終了処理・上位3決定・匿名解除すべて U6。U3 (Eval) と U5 (Rec) は U6 から提供される Cycle Service / Cycle Read API を利用。
- **B. U5 (Recognition) が Cycle 全体を所有**: 表彰サイクルの主目的が「上位3決定 + 匿名解除」なので U5 が中心。U6 (Admin) は Cycle の CRUD のみ提供。
- **C. Cycle を独立ユニット (U7=Cycles) に切り出し、計 7-8ユニット**: Cycle ロジックの一貫性を最優先し、独立サービス/モジュールとして分離。
- **D. 自由記述**

**AI 推奨**: **A**。理由:
1. ストーリーマッピング: US-031 (自動集計) / US-032 (上位3決定) / US-033 (氏名公開) / US-036 (Cycle 作成) / US-037 (Cycle 終了) はすべて Admin/運用文脈で、運用責任が U6
2. EP-REC (US-034 殿堂ページ / US-035 殿堂履歴) は **読み取り専用ビュー** で、書き込み (上位3決定・匿名解除) は U6 のサイクル終了処理に内包
3. U3 (Eval) は Cycle の状態 (`OPEN`/`CLOSED`) を読むだけ。`CycleService.assertOpen()` のような薄い API で十分
4. 1ユニット 1責務の原則で、Cycle のライフサイクル管理を U6 に集約

[Answer]: A

---

### Q6. ユニット間データ依存（Dependencies）

**問**: モノリス (Q1=A) を選んだ場合、ユニット間のデータアクセスはどのパターンを採用しますか？

- **A. 共有 Prisma Schema、Service 層経由でクロスユニット呼び出し**: 全ユニットが同じ MySQL DB と Prisma Schema を共有。他ユニットのデータが必要な場合は他ユニットの Service を呼び出す（例: `EvaluationService` が `IdeaService.findOne()` を呼ぶ）。Repository は同ユニット内のみアクセス。
- **B. 共有 Prisma Schema、各ユニットが他ユニットのテーブルを直接 Read 可**: ユニット間の依存を緩く保つため Read は自由、Write は所有ユニット経由。
- **C. ユニット = サブスキーマで物理分割**: User テーブルは Auth ユニット所有、Idea テーブルは Submission ユニット所有、JOIN は禁止しユニット間は API 呼び出し。

**AI 推奨**: **A**。理由:
1. Q1=A (モノリス) なら DB は単一なので物理分割の意味が薄い
2. Service 経由のクロスユニット呼び出しは「ユニット境界 = ビジネス Service の境界」という規律を保てる
3. Repository を同ユニット内に閉じることで、テスト時のモック境界も明確
4. C は将来のマイクロサービス化時の選択肢で、今は YAGNI

[Answer]: A

---

### Q7. ユニット実装順序（Technical Considerations）

**問**: CONSTRUCTION フェーズで Per-Unit ループを回す順序は？依存関係から U0 (Shared) → U1 (Auth) は固定として、以降の順序を決めます。

- **A. クリティカルパス順 (推奨)**: U0 → U1 (Auth) → U2 (Submission) → U3 (Evaluation) → U6 (Admin/Cycles) → U4 (Dashboard) → U5 (Recognition)。理由: 投稿→評価→サイクル管理→読み取りビュー の自然な業務フロー、Admin の Cycle 機能を Dashboard/Recognition より先に実装することで Cycle 集計が必要なユニットの依存が解消。
- **B. ユーザー価値順**: U0 → U1 → U2 (投稿) → U4 (Dashboard) → U3 (Eval) → U6 (Admin) → U5 (Rec)。Submitter の体験を最優先。
- **C. 依存最小順**: U0 → U1 → U6 (Admin/Cycles) → U2 → U3 → U4 → U5。Cycle を最初に作っておくことで以降の依存ハマりを回避。
- **D. 自由記述**

**AI 推奨**: **C (依存最小順)**。理由:
1. Cycle は U2 (投稿) / U3 (評価) / U4 (Dashboard) / U5 (Rec) すべてから参照される根幹データ
2. U6 を早く作ることで Cycle の状態判定 (`OPEN`/`CLOSED`) が後続ユニットで使える
3. U2 投稿時に「現在の Cycle に紐付け」する仕様 (要件) があれば U6 が先必須
4. ただしビジネス価値検証の観点では B (Dashboard 早期) も有力

[Answer]: C

---

### Q8. ストーリーの分割 / 跨ぎ（Story Grouping）

**問**: 以下のストーリーは複数ユニットにまたがる可能性があります。各ストーリーをどのユニットに割り当てますか？

| Story | 内容 | 候補ユニット | AI 推奨 |
|---|---|---|---|
| US-007 ロール別ナビゲーション | FE レイアウトでロール条件分岐 | U0 / U1 | **U0** (Shared FE foundation 内の Navigation 共通コンポーネント。各ユニットは自分のメニュー項目を提供) |
| US-027 アイデア詳細ページ | 詳細ビュー (匿名 vs 公開後) | U2 / U4 | **U4** (Dashboard の読み取りビューの一部。投稿後は Eval/匿名公開状態の表示も含むため Dashboard 文脈) |
| US-029 準リアルタイム更新 | SSE Hub | U0 / U4 | **U0** (SSE Hub 基盤は U0、各ユニットが Publisher として利用) |
| US-031 サイクル終了処理 | 集計・上位3決定・匿名解除 | U5 / U6 | **U6** (Q5 の Cycle 所有権ルールに従う) |
| US-038 パネルメンバー一覧管理 | 管理画面 | U1 / U6 | **U6** (Admin パネル内、U1 は API 提供のみ) |

**問**: 上記の AI 推奨割当に同意しますか？

- **A. 全て同意**
- **B. 部分修正**（修正点を [Answer] に記述）
- **C. 全面再検討**

[Answer]: A

---

### Q9. チームアラインメント / オーナーシップ（Team Alignment）

**問**: このプロジェクトの開発体制は？ユニット境界がチーム境界と一致するかどうかでユニット定義が変わる可能性があります。

- **A. 1人 (ソロ開発、AI ペアプロ)**: ユニット境界は AI が per-unit ループを回すための論理境界。Conway の法則の制約なし。
- **B. 2-3人の小チーム**: ユニット単位で並行開発できる粒度（疎結合）が望ましい。
- **C. 複数チーム (機能チーム × 横断チーム)**: 強い疎結合と契約ベースの API 境界が必要。

**AI 推奨**: **A (ソロ開発、AI ペアプロ)** を仮定します。要件 G-9「ローカル開発のみ」「PoC」から推測。

[Answer]: A

---

### Q10. ユニット完了の定義（Technical Considerations）

**問**: 各ユニットの「完成」の定義は？

- **A. AC 全部達成 + Unit Test (80% カバレッジ) + 該当 Epic の手動 e2e 検証通過**
- **B. AC 全部達成 + Unit Test (80%) + Integration Test (隣接ユニット連携) 通過**
- **C. AC 全部達成 + Unit Test (80%) のみ。Integration Test は Build and Test ステージで全ユニット完了後にまとめて実施**

**AI 推奨**: **C**。理由:
1. CLAUDE.md の Build and Test ステージで integration / performance / e2e を一括実施する定義に整合
2. 各 per-unit ループでは Unit Test に集中し、ユニット間連携は最後の Build and Test で検証
3. テストの 80% カバレッジは ~/.claude/rules/ecc/common/testing.md の必須要件

[Answer]: C

---

## 2. 生成成果物（PART 2 で作成）

PART 2 の Generation で以下を生成します（Q1〜Q10 の回答に基づき確定）:

- [ ] `aidlc-docs/inception/application-design/unit-of-work.md`
  - ユニット定義（U0〜U6）と責務
  - 各ユニットの所属モジュール（Backend/Frontend）
  - 各ユニットの Story Count と Must/Should/Could 内訳
  - Greenfield コード組織戦略（Q1 / Q3 から導出）
- [ ] `aidlc-docs/inception/application-design/unit-of-work-dependency.md`
  - ユニット間依存マトリックス
  - 通信パターン（Service 経由 / Shared Module / DB 共有）
  - データフロー（実装順序ベース）
- [ ] `aidlc-docs/inception/application-design/unit-of-work-story-map.md`
  - 全 41 stories のユニット割当表
  - Epic ↔ Unit ↔ Story Triangle
  - 跨ぎストーリーの所属判定根拠（Q8）

## 3. PART 1 完了基準

- [x] unit-of-work-plan.md 生成（本ファイル）
- [x] Q1〜Q10 の `[Answer]:` タグ全部に回答記入（AI 推奨を採用 — 2026-05-05）
- [x] 曖昧性チェック完了（全推奨採用のため矛盾なし）
- [x] ユーザーが「PART 2 開始」を承認 — "奨励でok" (2026-05-05)

---

## 📋 ユーザーアクション

**Q1〜Q10 を確認してください。** AI が各質問に推奨値 (A 等) を `[Answer]:` に既に記入してあります。

- そのままで良ければ **"approve"** または **"そのままで OK"** とだけ返してください（推奨値を確定として PART 2 へ進む）
- 修正したい質問があれば、該当 Q 番号と修正内容を返してください（例: `Q1=B, Q5=C` など）

回答受領後、AI は曖昧性チェックを実施し、PART 2 (Generation) 開始の承認を求めます。
