# Application Design Plan — Ideation Portal

**Date**: 2026-05-03
**Status**: Awaiting User Input on Embedded Questions

このプランは Application Design ステージで作成され、ユーザーが埋め込み質問に回答後、`components.md` / `component-methods.md` / `services.md` / `component-dependency.md` / `application-design.md` を生成します。

---

## Methodology Overview

- **Source**: `requirements.md` + `stories.md` + `personas.md` + `execution-plan.md`
- **Scope**: 高レベルコンポーネント識別とサービスレイヤ設計（詳細業務ロジックは Functional Design で扱う）
- **Architecture Baseline**: Next.js (App Router) + NestJS + MySQL（Greenfield、ローカル開発）

---

## Pre-confirmed Decisions（要件から確定済み）

| 項目 | 値 | 出典 |
|---|---|---|
| Frontend | Next.js (App Router) + TypeScript | requirements.md G1 |
| Backend | NestJS + TypeScript | requirements.md G2 |
| Database | MySQL 8.x | requirements.md G3 |
| Authentication | 自前実装（メール/PW + ハッシュ化） | requirements.md FR-1 |
| Authorization | RBAC (Submitter / Panel / Admin) | requirements.md FR-1.3 |
| 環境 | ローカル Docker Compose | requirements.md C-1 |

---

## Mandatory Artifacts (生成予定)

- [ ] `aidlc-docs/inception/application-design/components.md` — コンポーネント定義と責務
- [ ] `aidlc-docs/inception/application-design/component-methods.md` — メソッドシグネチャ
- [ ] `aidlc-docs/inception/application-design/services.md` — サービスレイヤとオーケストレーション
- [ ] `aidlc-docs/inception/application-design/component-dependency.md` — 依存関係と通信パターン
- [ ] `aidlc-docs/inception/application-design/application-design.md` — 上記を統合した1枚もの

---

## Plan Checklist (実行ステップ)

- [ ] **Step AD-1**: バックエンド NestJS モジュール構成を確定（feature module / shared module）
- [ ] **Step AD-2**: フロントエンド Next.js ルート構成を確定（ページツリー）
- [ ] **Step AD-3**: コンポーネント (Auth / Idea / Score / Cycle / Recognition / Admin) の責務とインターフェースを定義
- [ ] **Step AD-4**: 各コンポーネントのサービスメソッドシグネチャを記述
- [ ] **Step AD-5**: コンポーネント間依存と通信パターン（HTTP / イベント / DB）を記述
- [ ] **Step AD-6**: 統合 application-design.md を生成

---

## Embedded Questions (User Input Required)

### Question Q1: バックエンド ORM
NestJS で MySQL にアクセスする ORM はどれにしますか?

A) **Prisma** — 型安全、マイグレーション管理が優秀、開発体験が良い
B) **TypeORM** — NestJS 公式チュートリアルで推奨、デコレータベース
C) **MikroORM** — Identity Map / Unit of Work、Domain-Driven Design 寄り
D) おまかせ（AI が推奨）→ AI 推奨は **Prisma**（型安全性 + マイグレーション簡便性）
E) Other (please describe after [Answer]: tag below)

[Answer]: A

### Question Q2: アーキテクチャスタイル
NestJS バックエンドの内部構成はどれにしますか?

A) **Standard Layered** — Controller → Service → Repository（NestJS 慣例、シンプル）
B) **Modular Monolith** — Feature Module ごとに完全自己完結（Auth Module / Idea Module / ...）
C) **Hexagonal (Ports & Adapters)** — Domain / Application / Infrastructure を分離
D) おまかせ → AI 推奨は **B Modular Monolith** + Layered（Feature Module 内部は Layered）
E) Other (please describe after [Answer]: tag below)

[Answer]: A

### Question Q3: 認証方式
ログインセッション管理はどれにしますか?

A) **JWT (Access + Refresh Token)** — ステートレス、API ファースト
B) **Session Cookie** — サーバー側セッション、Same-Origin に最適
C) おまかせ → AI 推奨は **B Session Cookie**（ローカル MVP、Same-Origin 想定、CSRF 対策含めシンプル）
D) Other (please describe after [Answer]: tag below)

[Answer]: A

### Question Q4: リアルタイム反映の実装
ダッシュボード更新の方式はどれにしますか?

A) **SSE (Server-Sent Events)** — サーバー push、ブラウザ側軽量
B) **短間隔ポーリング (5〜15秒)** — 実装が最もシンプル、サーバー負荷予測しやすい
C) **WebSocket** — 双方向、オーバースペック（要件 NFR-1 では準リアルタイムで十分）
D) おまかせ → AI 推奨は **B ポーリング**（〜100名規模、準リアルタイム要件、シンプル優先）
E) Other (please describe after [Answer]: tag below)

[Answer]: A

### Question Q5: 画像添付の保存方式
PNG/JPG 画像（最大3枚 × 5MB）の保存先はどれにしますか?

A) **ローカルファイルシステム** — `uploads/` ディレクトリにマウント、開発で扱いやすい
B) **MySQL BLOB** — DB に直接保存、バックアップ単純化
C) **MinIO（S3 互換、Docker Compose 同居）** — 本番拡張時に S3 に切替容易
D) おまかせ → AI 推奨は **A ローカルファイルシステム**（ローカル MVP の最小構成）
E) Other (please describe after [Answer]: tag below)

[Answer]: A

### Question Q6: API スタイル
バックエンド API のスタイルはどれにしますか?

A) **REST (OpenAPI/Swagger 自動生成)** — NestJS 標準、シンプル
B) **tRPC** — 型安全、Next.js + NestJS で型共有しやすい（ただし NestJS との統合は工夫が必要）
C) **GraphQL** — 柔軟だが MVP にはオーバースペック
D) おまかせ → AI 推奨は **A REST + Swagger**（NestJS 標準、認証/認可も標準パターンで実装容易）
E) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## 回答完了の合図

すべての `[Answer]:` を埋めたら、チャットで「**done**」「**完了**」などとお知らせください。回答に基づき Application Design 成果物（5ファイル）を生成します。

「すべて AI 推奨」で進めたい場合は、それぞれの推奨選択肢（Q1=D→Prisma / Q2=D→Modular Monolith+Layered / Q3=C→Session Cookie / Q4=D→ポーリング / Q5=D→ローカル FS / Q6=D→REST+Swagger）の **D** を全て指定するか、チャットで「**全部 AI 推奨で**」とお伝えください。
