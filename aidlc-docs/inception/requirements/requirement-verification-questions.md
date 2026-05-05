# Requirements Verification Questions — Ideation Portal

以下の質問にお答えください。各質問の `[Answer]:` タグの後に **A / B / C / D / E / X** などの**英字**で回答を記入してください。
「Other」(X) を選択した場合は、`[Answer]: X` の後に説明文を続けてください。
すべての質問に回答後、「done」「完了」など合図をいただければ要件分析を続行します。

---

## A. Business Context（ビジネス文脈）

### Question A1
このプラットフォームを利用する**組織の想定規模**はどれですか?

A) 〜100名程度の小規模(社内チーム/部署単位)
B) 100〜1,000名程度の中規模(企業全社)
C) 1,000〜10,000名程度の大規模(中堅〜大企業)
D) 10,000名超の超大規模(グローバル/グループ全体)
E) Other (please describe after [Answer]: tag below)

[Answer]: A

### Question A2
**アイデア募集の運用形態**はどれですか?

A) 常時開放(従業員はいつでも投稿可、評価も常時)
B) キャンペーン型(期間限定で募集→締切後に評価→表彰)
C) 両立(常時開放しつつ、テーマ別キャンペーンも実施)
D) Other (please describe after [Answer]: tag below)

[Answer]: A

### Question A3
**主な成功指標 (KPI)** はどれを最重視しますか?(複数該当時は最重要1つ)

A) 投稿数の増加(参加率・心理的安全性)
B) 評価対象の質(高得点アイデアの数・採用率)
C) 評価プロセスの透明性・公平性
D) 表彰・認知の継続的な実施
E) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## B. Users & Roles（ユーザーとロール）

### Question B1
**システム上のロール**はどれですか?(最も近い構成)

A) 投稿者(社員) + 評価パネル + 管理者 の3種
B) 投稿者 + 評価パネル + 管理者 + 閲覧者(閲覧のみ)の4種
C) 投稿者 + 評価パネル + カテゴリオーナー + 管理者 + 閲覧者 の5種以上
D) Other (please describe after [Answer]: tag below)

[Answer]: A

### Question B2
**認証方式**はどれを希望しますか?

A) メール/パスワードの自前認証
B) 既存社内 SSO 連携(SAML / OIDC、例: Azure AD / Okta / Google Workspace)
C) ソーシャルログイン(Google / Microsoft 等)
D) ゲスト+管理者承認制
E) Other (please describe after [Answer]: tag below)

[Answer]: A

### Question B3
**投稿者の匿名性/識別**はどう扱いますか?

A) 投稿は実名(全員に氏名が見える)
B) 投稿は匿名化(評価パネルにも非開示。バイアス低減目的)
C) パネルには実名、一般閲覧者には匿名表示
D) 投稿者が選択可(実名/匿名トグル)
E) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## C. Submission Interface（投稿インターフェース)

### Question C1
**アイデア投稿フォームの構造化フィールド**は最低限どれを必須としますか?(最も近いセット)

A) タイトル + 概要 + 解決したい課題 + 提案内容
B) A) + 期待効果(ROI 想定) + 実現可能性メモ
C) B) + カテゴリ/タグ + 関連部署 + 添付ファイル
D) Other (please describe after [Answer]: tag below)

[Answer]: A

### Question C2
**ドラフト保存**の挙動はどれが望ましいですか?

A) 手動保存ボタンのみ
B) 自動保存(数秒間隔)+手動保存ボタン
C) 自動保存のみ(常時バックアップ)
D) Other (please describe after [Answer]: tag below)

[Answer]: B

### Question C3
**添付ファイル/メディア**の扱いはどうしますか?

A) テキストのみ(添付なし)
B) 画像のみ(PNG/JPG)
C) 画像+ドキュメント(PDF/Office)
D) 動画含む全種類(動画・音声含む)
E) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## D. Evaluation Framework（評価フレームワーク)

### Question D1
**評価軸(ディメンション)**はどれを採用しますか?

A) Feasibility / Impact / Innovation の3軸(初期要件のまま)
B) Feasibility / Impact / Innovation / Strategic Fit の4軸
C) Feasibility / Impact / Innovation / Cost / Time-to-Market の5軸
D) Other (please describe after [Answer]: tag below)

[Answer]: A

### Question D2
**スコアリングの尺度**はどれにしますか?

A) 5段階(1〜5)
B) 10段階(1〜10)
C) 100点満点
D) Other (please describe after [Answer]: tag below)

[Answer]: A

### Question D3
**最終スコア集計方式**はどれにしますか?

A) パネル全員のスコアの単純平均
B) 加重平均(軸ごとに重み設定。例: Impact 40%, Feasibility 30%, Innovation 30%)
C) 中央値(極端値の影響を排除)
D) パネル平均+異常値検知(外れ値除外)
E) Other (please describe after [Answer]: tag below)

[Answer]: A

### Question D4
**評価の独立性**はどう保証しますか?

A) 他パネルのスコア・コメントは評価期間中は完全非公開
B) 評価期間中は他パネルのスコアのみ非公開、コメントは共有可
C) 全パネル相互閲覧可(オープン討議型)
D) Other (please describe after [Answer]: tag below)

[Answer]: A

### Question D5
1人のパネルが**複数アイデアを同時並行で評価**できる必要はありますか?

A) はい、同時並行で評価できるダッシュボードが必須
B) 1件ずつシリアルに評価(キュー方式)
C) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## E. Dashboards & Analytics（ダッシュボードと分析)

### Question E1
**リアルタイム性**の要件はどれですか?

A) 厳密リアルタイム(WebSocket 等で1秒以内に反映)
B) 準リアルタイム(数秒〜数十秒。SSE/ポーリング)
C) ニアリアルタイム(1〜5分のキャッシュ更新で十分)
D) バッチ更新(日次/時次)
E) Other (please describe after [Answer]: tag below)

[Answer]: B

### Question E2
**リーダーボード/ランキングの公開範囲**はどれですか?

A) 全社員に公開(誰でも閲覧可)
B) 投稿者本人 + 評価パネル + 管理者のみ
C) 評価期間終了後のみ全社公開
D) Other (please describe after [Answer]: tag below)

[Answer]: A

### Question E3
**分析機能**で必要なビューはどれを優先しますか?

A) ディメンション別比較(評価軸ごとの上位アイデア)
B) 時系列トレンド(投稿数・スコアの推移)
C) カテゴリ/部署別のヒートマップ
D) パネル間スコア分散・一致度(信頼性メトリクス)
E) すべて(A〜D全部)
F) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## F. Recognition System（表彰システム)

### Question F1
**表彰対象**はどれですか?

A) 上位3アイデア(初期要件通り)のみ
B) 上位3 + カテゴリ別1位
C) 上位3 + 月間/四半期 MVP
D) Other (please describe after [Answer]: tag below)

[Answer]: Aで匿名

### Question F2
**表彰の通知/可視化方法**はどれを希望しますか?

A) 表彰ページ(プラットフォーム内殿堂)+ メール通知
B) A) + Slack/Teams 等チャット連携での自動告知
C) A) + B) + バッジ/プロフィール表示
D) Other (please describe after [Answer]: tag below)

[Answer]: Aでメール通知はいらない

---

## G. Technical Context（技術コンテキスト)

### Question G1
**フロントエンド技術スタック**の希望はありますか?

A) React (Next.js) + TypeScript
B) Vue (Nuxt) + TypeScript
C) おまかせ(プロジェクト適性で AI が推奨)
D) Other (please describe after [Answer]: tag below)

[Answer]: A

### Question G2
**バックエンド技術スタック**の希望はありますか?

A) Node.js (NestJS / Express) + TypeScript
B) Python (FastAPI / Django)
C) Java (Spring Boot)
D) Go
E) おまかせ(AI が推奨)
F) Other (please describe after [Answer]: tag below)

[Answer]: A

### Question G3
**データベース**の希望はありますか?

A) PostgreSQL(リレーショナル / 集計に強い)
B) MySQL
C) MongoDB(ドキュメント DB)
D) おまかせ
E) Other (please describe after [Answer]: tag below)

[Answer]: B

### Question G4
**デプロイ環境**はどれですか?

A) AWS (ECS/Fargate / RDS / S3 など)
B) GCP (Cloud Run / Cloud SQL など)
C) Azure
D) Kubernetes (任意クラウド)
E) オンプレミス
F) おまかせ
G) Other (please describe after [Answer]: tag below)

[Answer]: 一旦ローカルでやります

---

## H. Non-Functional Requirements（非機能要件)

### Question H1
**同時アクセスの想定ピーク**はどの程度ですか?

A) 100同時接続程度
B) 500〜1,000同時接続
C) 5,000同時接続以上
D) 不明(おまかせで一般的な値で設計)
E) Other (please describe after [Answer]: tag below)

[Answer]: A

### Question H2
**個人情報・機密データ**の取り扱いレベルはどれですか?

A) 社内利用のみ。GDPR / 個人情報保護法の標準対応で十分
B) アイデアの内容に機密情報を含む可能性あり(暗号化保存・アクセスログ必須)
C) 高機密(SOC 2 / ISO 27001 相当の運用が必要)
D) Other (please describe after [Answer]: tag below)

[Answer]: A

### Question H3
**多言語対応**は必要ですか?

A) 日本語のみ
B) 日本語 + 英語の2言語
C) 多言語(3言語以上、i18n フレームワーク必須)
D) Other (please describe after [Answer]: tag below)

[Answer]: A

### Question H4
**アクセシビリティ要件**(WCAG)のレベルはどれですか?

A) なし(機能優先)
B) WCAG 2.2 AA レベル準拠(キーボード操作・コントラスト・スクリーンリーダー対応)
C) WCAG 2.2 AAA レベル準拠
D) Other (please describe after [Answer]: tag below)

[Answer]: A

### Question H5
**データ保持期間**はどう設定しますか?

A) 1年(過ぎたアイデアは自動アーカイブ)
B) 3年
C) 永続(明示的削除のみ)
D) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## I. Integration（連携)

### Question I1
**社内システムとの連携**はどれが必要ですか?

A) 連携なし(スタンドアロン)
B) Slack / Microsoft Teams への通知連携のみ
C) 人事システム(部署/組織情報の同期)+ B)
D) すべて(SSO + 通知 + 人事 + 分析 BI)
E) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## J. Extensions Opt-In（拡張機能オプトイン)

### Question J1: Security Extensions
Should security extension rules be enforced for this project? (このプロジェクトで Security 拡張ルールを適用しますか?)

A) Yes — enforce all SECURITY rules as blocking constraints (recommended for production-grade applications)
B) No — skip all SECURITY rules (suitable for PoCs, prototypes, and experimental projects)
X) Other (please describe after [Answer]: tag below)

[Answer]: B

### Question J2: Property-Based Testing Extension
Should property-based testing (PBT) rules be enforced for this project? (PBT 拡張ルールを適用しますか?)

A) Yes — enforce all PBT rules as blocking constraints (recommended for projects with business logic, data transformations, serialization, or stateful components)
B) Partial — enforce PBT rules only for pure functions and serialization round-trips (suitable for projects with limited algorithmic complexity)
C) No — skip all PBT rules (suitable for simple CRUD applications, UI-only projects, or thin integration layers with no significant business logic)
X) Other (please describe after [Answer]: tag below)

[Answer]: C

---

## 回答完了の合図
すべての `[Answer]:` を埋め終えたら、チャットで「**done**」「**完了**」「**finished**」などとお知らせください。
矛盾や不明点があれば、フォローアップ質問ファイルを作成します。すべて解消後、`requirements.md` を生成します。
