# Requirements — Ideation Portal

**Version**: 1.0
**Date**: 2026-05-03
**Status**: Awaiting Approval
**Source**: User initial request + `requirement-verification-questions.md` + `requirements-clarification-questions.md`

---

## 1. Intent Analysis Summary

| 項目 | 値 |
|---|---|
| User Request (要約) | 社員が革新的アイデアを投稿し、評価パネルが透明な評価・スコアリング・表彰を行う社内向けデジタルプラットフォームを構築する |
| Request Type | New Project (Greenfield) |
| Initial Scope | System-wide（投稿・評価・ダッシュボード・分析・表彰の複数領域） |
| Initial Complexity | Moderate |
| Requirements Depth | Standard |
| Project Type | Greenfield |
| Deployment Target | ローカル開発のみ（本番デプロイは将来課題） |

---

## 2. Business Context

### 2.1 Goal
社内 (〜100名規模) のイノベーション文化を醸成するため、アイデア投稿・評価・表彰を一元化したポータルを構築する。

### 2.2 Operating Mode
- **常時開放型**: 従業員はいつでも投稿可能、評価パネルも常時評価できる。

### 2.3 Primary KPI
- **評価対象の質** (高得点アイデア数・採用率) を最重視。

### 2.4 Stakeholders / Roles
| Role | 説明 |
|---|---|
| Submitter (投稿者) | 全社員。アイデアを投稿・編集・ドラフト保存できる |
| Panel Member (評価パネル) | 認可されたメンバー。投稿された全アイデアを各評価軸でスコアリング |
| Administrator (管理者) | パネルメンバー管理・評価期間の運用・表彰確定・データ管理 |

---

## 3. Functional Requirements (FR)

### FR-1. Authentication & Authorization
- **FR-1.1**: メール/パスワードによる自前認証を実装する。
- **FR-1.2**: パスワードはハッシュ化（例: bcrypt / argon2）して保存する。
- **FR-1.3**: ロールベースアクセス制御 (RBAC) で Submitter / Panel / Admin の3ロールを区別する。
- **FR-1.4**: ログイン中ユーザーのみ全機能にアクセスできる。
- **FR-1.5**: 管理者はパネルメンバーを任命/解除できる。

### FR-2. Idea Submission
- **FR-2.1**: 投稿者は以下の必須フィールドを持つフォームでアイデアを投稿できる:
  - **タイトル** (必須、255文字以内)
  - **概要** (必須、500文字以内)
  - **解決したい課題** (必須、自由記述)
  - **提案内容** (必須、自由記述)
- **FR-2.2**: 画像 (PNG / JPG) を添付できる。1投稿あたり最大3枚、各5MB 以下。
- **FR-2.3**: ドラフト保存:
  - **自動保存** を入力中に行う（5〜10秒間隔のデバウンス推奨）。
  - **手動保存ボタン** も提供する。
- **FR-2.4**: 投稿者は自分のドラフトと公開済み投稿を一覧で確認できる。
- **FR-2.5**: 公開後の編集ポリシー: **MVP では編集不可**（評価の整合性を担保。将来の拡張として議論余地あり）。

### FR-3. Anonymity
- **FR-3.1**: 評価期間中、投稿は **完全匿名** で評価パネル・閲覧者・他投稿者すべてに対して投稿者氏名を非表示とする。
- **FR-3.2**: 評価終了 (評価サイクルクローズ後の集計確定時点) において、**上位3アイデアのみ** 自動的に投稿者氏名を公開する。
- **FR-3.3**: 上位3名以外は匿名状態を維持する。
- **FR-3.4**: 投稿者本人は自分の投稿（匿名状態下でも）を識別可能。

### FR-4. Evaluation Framework
- **FR-4.1**: 評価軸は **3軸** とする:
  - **Feasibility** (実現可能性)
  - **Impact** (組織/ビジネスへの影響)
  - **Innovation** (革新性)
- **FR-4.2**: スコアリング尺度は **5段階 (1〜5の整数)** とする。
- **FR-4.3**: パネルメンバーは投稿された全アイデアに対し、3軸それぞれにスコアを付ける。
- **FR-4.4**: パネルメンバーは任意でスコア理由のコメントを残せる。
- **FR-4.5**: 1人のパネルが **複数アイデアを同時並行で評価** できるダッシュボード UI を提供する（評価キュー/タブ切替式）。
- **FR-4.6**: パネルメンバーは自分のスコアを評価期間中、後から修正できる（評価確定操作で締め切る）。

### FR-5. Evaluation Independence (評価の独立性)
- **FR-5.1**: 評価期間中、他パネルのスコアおよびコメントは **完全非公開** とする。
- **FR-5.2**: 自身のスコアのみ閲覧/修正可能。
- **FR-5.3**: 評価終了後、管理者と投稿者本人のみが詳細スコア（誰が何点付けたか）を確認可能。

### FR-6. Score Aggregation
- **FR-6.1**: 各アイデアの最終スコアは、**パネル全員のスコアの単純平均** で算出する。
  - 各軸ごとに平均スコア（小数点以下2桁）を計算。
  - 総合スコア = 3軸の平均値の合計（または平均、UI で両表示）。
- **FR-6.2**: 集計はパネル全員が評価確定した時点、または管理者が評価期間を締め切った時点で確定する。
- **FR-6.3**: 評価未完了 (一部パネルのみスコア提出) の中間状態は、ダッシュボードでは「N人/M人完了」のステータス表示とともに暫定スコアを表示する。

### FR-7. Real-time Dashboards & Leaderboards
- **FR-7.1**: 全社員が閲覧可能なリーダーボード/ダッシュボードページを提供する。
- **FR-7.2**: 反映遅延は **準リアルタイム (数秒〜数十秒)** とする。SSE / 短間隔ポーリング (5〜15秒) を許容する。
- **FR-7.3**: ダッシュボードでは以下を表示:
  - 全アイデア一覧 + 総合スコア順
  - 評価軸別ランキング (Feasibility / Impact / Innovation)
  - 投稿状況 (投稿数、評価完了数)
- **FR-7.4**: 個別アイデア詳細ページでは 3軸の平均スコアをレーダーチャートまたは棒グラフで表示する。

### FR-8. Analytics
- **FR-8.1**: 主要分析ビューとして **ディメンション別比較** (3軸ごとの上位アイデア・スコア分布) を提供する。
- **FR-8.2**: 管理者向けに以下のメトリクスを提供:
  - 総投稿数、期間別投稿数
  - 評価進捗率 (パネルごとの評価完了率)
  - 各軸の平均スコア・分布

### FR-9. Recognition System
- **FR-9.1**: 上位3アイデアを総合スコア順に決定する。
- **FR-9.2**: 表彰殿堂ページ (Hall of Fame) を提供し、上位3アイデア (タイトル・概要・スコア・投稿者氏名) を表示する。
- **FR-9.3**: 過去の評価サイクル/期間ごとの殿堂履歴を保持・閲覧できる。
- **FR-9.4**: メール通知や Slack/Teams 連携は **実装しない** (本要件範囲外)。

### FR-10. Administration
- **FR-10.1**: 管理者は評価サイクル/期間を作成・終了できる（明示的にサイクルを使う場合）。
- **FR-10.2**: 管理者はパネルメンバーを管理 (任命/解除) できる。
- **FR-10.3**: 管理者は不適切な投稿を削除できる（監査ログを残す）。

### FR-11. Data Retention
- **FR-11.1**: アイデアは投稿から **1年経過後に自動アーカイブ** する（ステータス変更、リーダーボードからは除外、データは保持）。
- **FR-11.2**: アーカイブ済みデータは管理者のみ閲覧可能。

---

## 4. Non-Functional Requirements (NFR)

### NFR-1. Performance & Scale
- **NFR-1.1**: 想定同時接続数は **100ユーザー** 程度。
- **NFR-1.2**: ページ初期ロード 2秒以内（ローカル開発環境基準）。
- **NFR-1.3**: ダッシュボードのスコア反映遅延は **30秒以内**。

### NFR-2. Security
- **NFR-2.1**: 社内利用前提、機密度は **標準 (GDPR / 個人情報保護法レベル)**。
- **NFR-2.2**: パスワードはハッシュ化保存、平文保存禁止。
- **NFR-2.3**: HTTPS は本番デプロイ時の必須要件（ローカル開発では HTTP 可）。
- **NFR-2.4**: XSS / CSRF / SQL インジェクション対策を Web フレームワーク標準機能で実装する。
- **NFR-2.5**: パネルメンバーが他パネルのスコアにアクセスできないこと (FR-5 を裏付ける認可テスト必須)。
- **NFR-2.6**: Security 拡張ルール集 (SOC 2 / ISO 27001 相当) は **適用しない** (Extension Config: J1=No)。

### NFR-3. Localization
- **NFR-3.1**: UI / メッセージはすべて **日本語** で提供する。
- **NFR-3.2**: 多言語切替機能は実装しない。

### NFR-4. Accessibility
- **NFR-4.1**: WCAG 2.2 準拠は **必須要件としない** (機能優先)。
- **NFR-4.2**: ただし最小限のアクセシビリティ (キーボード操作可能なフォーム、画像 alt 属性) は実装する。

### NFR-5. Reliability & Availability
- **NFR-5.1**: ローカル開発環境のため SLA 規定なし。
- **NFR-5.2**: データ損失防止のため、ドラフト自動保存は信頼性高く動作すること（保存成功表示・失敗時のリトライ）。

### NFR-6. Maintainability
- **NFR-6.1**: コードは TypeScript の strict モードで記述。
- **NFR-6.2**: ファイル長は 800行以内、関数は 50行以内（プロジェクト共通コーディング規約に準拠）。
- **NFR-6.3**: ドラフト保存・スコア計算など主要ロジックには Unit Test を書く。

### NFR-7. Testing
- **NFR-7.1**: 最低カバレッジ目標 **80%** (Unit + Integration)。
- **NFR-7.2**: PBT 拡張ルールは **適用しない** (Extension Config: J2=No)。標準的な Unit/Integration テストで対応。
- **NFR-7.3**: TDD (Red-Green-Refactor) を推奨する。

---

## 5. Technical Stack

| 層 | 採用技術 |
|---|---|
| Frontend | **Next.js (App Router) + TypeScript** |
| Backend | **NestJS (Node.js) + TypeScript** ※ Express ベースのシンプルな選択肢も後段で評価可 |
| Database | **MySQL 8.x** |
| ORM | TBD（NestJS 慣例的には TypeORM または Prisma。Construction 段階で決定） |
| Authentication | 自前実装（JWT または session ベース、Construction 段階で決定） |
| Realtime | SSE もしくは短間隔ポーリング（WebSocket 不要） |
| 開発環境 | **ローカルのみ** (Docker Compose で MySQL 等を立ち上げる構成を想定) |
| デプロイ | **本番デプロイは現フェーズの範囲外**。MVP 完成後に再検討。 |

---

## 6. Constraints

- **C-1**: 本番デプロイは将来課題。本要件定義は MVP（ローカル動作）までを対象。
- **C-2**: メール送信機能は実装しない。
- **C-3**: Slack / Teams / 人事システム / SSO 連携は実装しない (I1=A スタンドアロン)。
- **C-4**: 多言語対応は実装しない。
- **C-5**: WCAG 準拠は必須要件としない。
- **C-6**: Security / PBT 拡張ルール集は適用しない。

---

## 7. Assumptions

- **A-1**: 想定ユーザー数 〜100名のため、データベースは MySQL 単一インスタンスで十分。
- **A-2**: パネルメンバーは管理者が手動で任命する（自動アサインメント不要）。
- **A-3**: 評価サイクル (期間設定) はあってもよいが、常時開放のため期間定義は管理者が任意で設定するオプション機能として扱う。
- **A-4**: ローカル開発のため、外部サービス (S3, SendGrid, etc.) には依存しない。

---

## 8. Out of Scope (本要件定義の範囲外)

- 本番環境へのデプロイ・運用設計
- メール通知機能
- Slack / Teams 連携
- SSO / 人事システム連携
- 多言語対応
- モバイルアプリ（Web レスポンシブで対応）
- 高度な分析（時系列トレンド、ヒートマップ、信頼性メトリクス。E3=A により、ディメンション別比較のみが MVP の対象）

---

## 9. Extension Configuration

| Extension | Status | Notes |
|---|---|---|
| security/baseline | **Disabled** | J1=B。ローカル PoC のため Security 拡張ルール非適用。標準的セキュリティのみ実装。 |
| testing/property-based | **Disabled** | Clarification Q2=C。シンプル CRUD のため PBT 非適用。 |

---

## 10. Source Q&A Mapping (要件のトレーサビリティ)

| 要件 ID | 出典質問 | 回答 |
|---|---|---|
| Project Scale (NFR-1.1) | A1 | A (〜100名小規模) |
| Operating Mode (2.2) | A2 | A (常時開放) |
| KPI (2.3) | A3 | B (評価対象の質) |
| Roles (2.4) | B1 | A (3ロール) |
| Auth (FR-1.1) | B2 | A (メール/PW) |
| Anonymity (FR-3) | B3 + Clarification Q1 | B + A (完全匿名 → 上位3のみ氏名公開) |
| Submission Fields (FR-2.1) | C1 | A (基本4フィールド) |
| Draft Save (FR-2.3) | C2 | B (自動+手動) |
| Attachments (FR-2.2) | C3 | B (画像のみ) |
| Eval Dimensions (FR-4.1) | D1 | A (3軸) |
| Score Scale (FR-4.2) | D2 | A (5段階) |
| Aggregation (FR-6.1) | D3 | A (単純平均) |
| Independence (FR-5) | D4 | A (完全非公開) |
| Parallel Evaluation (FR-4.5) | D5 | A (並行評価) |
| Realtime (FR-7.2) | E1 | B (準リアルタイム) |
| Leaderboard Visibility (FR-7.1) | E2 | A (全社員公開) |
| Analytics (FR-8.1) | E3 | A (ディメンション別比較) |
| Recognition Target (FR-9.1) | F1 | A (上位3) |
| Recognition Notification (FR-9.4) | F2 | Custom (殿堂ページのみ、メール不要) |
| Frontend (5) | G1 | A (Next.js + TS) |
| Backend (5) | G2 | A (NestJS + TS) |
| Database (5) | G3 | B (MySQL) |
| Deployment (C-1) | G4 | Custom (ローカル開発のみ) |
| Concurrent Users (NFR-1.1) | H1 | A (100同時) |
| Security Level (NFR-2.1) | H2 | A (社内標準) |
| Localization (NFR-3) | H3 | A (日本語のみ) |
| Accessibility (NFR-4) | H4 | A (WCAG 非対応) |
| Data Retention (FR-11.1) | H5 | A (1年) |
| Integration (C-3) | I1 | A (連携なし) |
| Security Extension (NFR-2.6) | J1 | B (No) |
| PBT Extension (NFR-7.2) | Clarification Q2 | C (No) |
