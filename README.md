# Ideation Portal

社内向けアイデア投稿・評価・表彰ポータル。AI-DLC (AI-Driven Lifecycle) ワークフローに沿って設計・実装。

## 概要

社員が革新的アイデアを匿名で投稿し、評価パネルが3軸 (Feasibility / Impact / Innovation) で透明にスコアリングし、評価サイクル終了時に上位3アイデアを表彰殿堂で公開するプラットフォーム。

| 項目 | 値 |
|---|---|
| 規模 | 〜100ユーザー / 100同時接続 |
| 環境 | ローカル Docker Compose のみ (PoC) |
| 主要機能 | アイデア投稿 / ドラフト保存 / 3軸スコアリング / リーダーボード / 殿堂 / 管理 |

## 技術スタック

### Backend
- **Framework**: NestJS 10 (TypeScript strict)
- **ORM**: Prisma 5
- **DB**: MySQL 8
- **Auth**: JWT (Access 15min / Refresh 7d, Rotation あり)
- **Realtime**: SSE (Server-Sent Events)
- **Validation**: class-validator + class-transformer
- **Logger**: pino + nestjs-pino (JSON 構造化)
- **Test**: Jest + supertest (Unit/Integration/E2E)

### Frontend
- **Framework**: Next.js 14 (App Router)
- **UI**: Tailwind CSS + shadcn/ui
- **Form**: React Hook Form + zod
- **Data**: TanStack Query 5
- **Test**: Vitest + Playwright

### Infra
- **Container**: Docker + Docker Compose v2
- **Service 構成**: 3 コンテナ (frontend / backend / db)

## アーキテクチャ

7 ユニット構成 (NestJS Module で論理分割、モノリスデプロイ):

| Unit | 名称 | 主担当 |
|---|---|---|
| U0 | Shared Foundation | Prisma / Auth基盤 / SSE Hub / 共通 FE 基盤 |
| U1 | Auth & Users | 登録 / ログイン / ロール管理 |
| U2 | Idea Submission | 投稿 / ドラフト / 添付 |
| U3 | Evaluation | スコアリング / 確定 |
| U4 | Dashboard | リーダーボード / SSE 反映 |
| U5 | Recognition | 殿堂 / 履歴 |
| U6 | Admin & Cycles | サイクル管理 / 上位3決定 / 管理画面 |

詳細は `aidlc-docs/inception/application-design/` を参照。

## ドキュメント

このリポジトリは AI-DLC ワークフローの全成果物を含みます:

```
aidlc-docs/
├── inception/                  # 要件定義 / ユーザーストーリー / アプリ設計
│   ├── requirements/
│   ├── user-stories/
│   ├── plans/
│   └── application-design/
├── construction/               # 構築フェーズ (per-unit)
│   ├── plans/
│   └── u0-shared-foundation/
│       ├── functional-design/
│       ├── nfr-requirements/
│       └── nfr-design/
├── aidlc-state.md              # 進捗トラッキング
└── audit.md                    # 完全な対話監査ログ
```

## セットアップ (実装後)

### 必要環境
- Node.js 20.x LTS
- Docker + Docker Compose v2

### 手順 (U0 完了後に有効)
```bash
git clone https://github.com/kouki4416/ai-dlc-demo.git
cd ai-dlc-demo
cp .env.example .env
docker compose up -d
```

## 開発状況

| Phase | Stage | Status |
|---|---|---|
| INCEPTION | Workspace Detection | ✅ |
| INCEPTION | Requirements Analysis | ✅ |
| INCEPTION | User Stories | ✅ (6 Epics / 41 stories) |
| INCEPTION | Workflow Planning | ✅ |
| INCEPTION | Application Design | ✅ |
| INCEPTION | Units Generation | ✅ (7 ユニット) |
| CONSTRUCTION | U0 Functional Design | ✅ |
| CONSTRUCTION | U0 NFR Requirements | ✅ |
| CONSTRUCTION | U0 NFR Design | ✅ |
| CONSTRUCTION | U0 Code Generation | 🚧 In Progress |
| CONSTRUCTION | U1〜U5 | ⏳ 待機 |
| CONSTRUCTION | Build and Test | ⏳ 待機 |

## ライセンス

MIT License — 詳細は [LICENSE](./LICENSE) を参照。
