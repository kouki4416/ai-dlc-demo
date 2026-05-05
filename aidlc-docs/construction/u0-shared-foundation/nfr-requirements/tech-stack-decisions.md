# U0 Shared Foundation — Tech Stack Decisions

**Date**: 2026-05-05
**Status**: Approved
**Source**: application-design.md / functional-design Q1〜Q14 / nfr-requirements Q1〜Q12

このドキュメントは U0 (および後続ユニット) が利用する技術選定とその理由をまとめます。バージョン pin 戦略・代替案・将来見直し条件も含みます。

---

## 1. Backend

| 領域 | 採用 | バージョン | 選定理由 | 代替案 (採用せず) |
|---|---|---|---|---|
| 言語 | TypeScript | `^5.4.x` | requirements G2 / NFR-6.1 strict 必須 | JavaScript (型安全性不足) |
| Framework | NestJS | `^10.4.x` | application-design 確定、Module 機能でユニット境界を綺麗に分離可能、DI 標準 | Express (構造化弱)、Fastify (DI なし) |
| ORM | Prisma | `^5.20.x` | application-design Q1 確定、型安全、マイグレーション/CLI 充実 | TypeORM (decorator 過剰)、Drizzle (新興) |
| DB | MySQL | `8.x` | requirements G3 確定 | PostgreSQL (要件指定外) |
| Validation | class-validator + class-transformer | `^0.14.x` / `^0.5.x` | nfr-requirements Q10 確定、NestJS 標準、Swagger 連携 | zod (NestJS 統合に追加 wrapper 必要) |
| Auth | @nestjs/jwt + @nestjs/passport + passport-jwt + bcrypt | `^10.x` / `^10.x` / `^4.x` / `^5.x` | NestJS 標準、application-design Q3 確定 (JWT) | session-based (要件外) |
| Logger | nestjs-pino + pino | `^4.x` / `^9.x` | nfr-requirements Q12 確定、構造化、最速 | winston (低速)、NestJS 標準 logger (構造化なし) |
| SSE | RxJS Subject + NestJS @Sse | `^7.x` (NestJS 内蔵) | application-design Q4 確定、Q1 インメモリ EventEmitter | Redis pub/sub (規模超過) |
| Health | @nestjs/terminus | `^10.x` | functional-design Q14 確定 | 自前実装 |
| Rate Limit | @nestjs/throttler | `^6.x` | nfr-requirements Q3 確定 | 自前実装 |
| Security Headers | helmet | `^8.x` | nfr-requirements Q8 確定 | 自前 middleware |
| File Upload | @nestjs/platform-express + multer | NestJS 内蔵 | application-design Q5 ローカル FS 確定 | NestJS Fastify adapter (Express ecosystem 推奨) |
| Test (unit/int) | Jest + ts-jest + supertest | `^29.x` / `^29.x` / `^7.x` | nfr-requirements Q7 確定、NestJS 標準テンプレート | Vitest (NestJS 統合実績薄) |
| Code Quality | ESLint + Prettier + husky + lint-staged | `^8.x` / `^3.x` / `^9.x` / `^15.x` | nfr-requirements Q10 確定 | Biome (新興、NestJS template 対応薄) |

---

## 2. Frontend

| 領域 | 採用 | バージョン | 選定理由 | 代替案 (採用せず) |
|---|---|---|---|---|
| 言語 | TypeScript | `^5.4.x` | NFR-6.1 strict | — |
| Framework | Next.js | `^14.x` (App Router) | requirements G1 確定 | Vite + React (SSR/Routing 自前) |
| UI Lib | React | `^18.x` (Next.js 内蔵) | Next.js 14 の React 標準 | — |
| Styling | Tailwind CSS | `^3.4.x` | functional-design Q13 確定、shadcn/ui 前提 | CSS Modules、styled-components |
| Component Lib | shadcn/ui | (CLI 生成、依存薄) | functional-design Q13 確定、Tailwind と整合、必要分だけ取り込む | MUI (重)、Chakra UI (Tailwind と二重) |
| Form | React Hook Form + zod + @hookform/resolvers | `^7.x` / `^3.x` / `^3.x` | functional-design Q13 確定 | Formik (legacy) |
| Data Fetching | TanStack Query (React Query) | `^5.x` | functional-design Q13 確定、SSE と組み合わせて再フェッチ | SWR (機能弱) |
| HTTP Client | axios | `^1.x` | functional-design Q13 確定、interceptor 充実 | fetch (interceptor 自前実装が手間) |
| State Mgmt | React Context | (React 内蔵) | functional-design Q13 確定、規模 100 ユーザーで Redux/Zustand は YAGNI | Redux (オーバーキル) |
| Icons | lucide-react | `^0.4xx.x` | functional-design Q13 確定、shadcn 公式推奨 | react-icons (バンドル肥大) |
| Charts | recharts | `^2.x` | レーダーチャート / 棒グラフ (FR-7.4)、Tailwind と整合 | Chart.js / D3 直叩き |
| Toast | sonner | `^1.x` | functional-design Q13 確定、shadcn 公式推奨 | react-hot-toast |
| Date | date-fns | `^3.x` | 軽量、関数型 | dayjs (i18n 不要なため日付フォーマット用途では同等)、moment (legacy) |
| Test (unit/comp) | Vitest + @testing-library/react + jsdom | `^2.x` / `^16.x` / `^25.x` | nfr-requirements Q7 確定、Next.js 14 の ESM 互換 | Jest (Next.js 14 で transformer 設定が複雑) |
| Test (E2E) | Playwright | `^1.4x.x` | nfr-requirements Q7 確定 | Cypress (実行速度劣) |
| Code Quality | ESLint (Next.js preset) + Prettier | `^8.x` / `^3.x` | Next.js 標準 | — |
| a11y Lint | eslint-plugin-jsx-a11y | (Next.js preset 内蔵) | NFR-4.2 最小 a11y | — |

---

## 3. インフラ / 開発環境

| 領域 | 採用 | バージョン | 選定理由 |
|---|---|---|---|
| Container | Docker + Docker Compose | Docker `^24.x` / Compose v2 | application-design 確定、ローカル開発のみ |
| サービス構成 | 3 コンテナ (frontend / backend / db) | — | unit-of-work.md 確定 |
| Node.js | Node | `^20.x LTS` | NestJS 10 / Next.js 14 動作確認済バージョン |
| パッケージマネージャ | npm | Node 同梱 | シンプル、CI 標準 |
| MySQL イメージ | `mysql:8.0` | — | requirements G3 |
| ホットリロード | NestJS `nest start --watch` / Next.js dev server | — | 開発体験 |

---

## 4. バージョン Pin 戦略

### 4.1 セマンティックバージョニング採択方針

- **Caret (`^`)** をデフォルト採用: minor / patch アップデートを許容
- **Tilde (`~`)** や exact pin は使わない: PoC で頻繁な依存更新は不要
- **`package-lock.json` を必ず commit**: 再現性確保

### 4.2 メジャーバージョンアップグレード方針

| 種別 | 対応 |
|---|---|
| Framework (Next.js / NestJS) | メジャー更新は実験ブランチで検証後マージ |
| ORM (Prisma) | マイグレーション互換性確認後に更新 |
| 開発ツール (ESLint / Prettier) | 配布時の breaking change を確認後 |

### 4.3 セキュリティパッチ方針

- `npm audit` で **HIGH / CRITICAL** が出た場合は即座に対応
- Dependabot 等の自動 PR は PoC では未設定（手動 `npm audit` を Build and Test ステージで実施）

---

## 5. 採用却下したライブラリと理由（重要）

| 却下したもの | 理由 |
|---|---|
| Redux / Zustand | 規模 100 ユーザー、認証以外の global state 不要 → React Context で十分 |
| Redis | 規模超過、SSE はインメモリで足りる、運用負荷増 |
| Microservices アーキ | unit-of-work.md Q1=A モノリス確定、PoC でオーバーキル |
| GraphQL | application-design Q6=A REST 確定、Schema 定義の二重管理避ける |
| MongoDB / NoSQL | requirements G3 MySQL 確定、トランザクション必須 (Cycle 終了処理) |
| OpenAPI Generator (FE 自動生成) | PoC では型を手動定義、複雑性回避 |
| Storybook | PoC では UI カタログ作成コスト > リターン |
| Sentry / DataDog | nfr-requirements Q11 確定、PoC では不要 |

---

## 6. 環境変数（.env.example）

```bash
# ===========================
# .env.example (commit 対象)
# ===========================

# Database
DATABASE_URL="mysql://app:apppass@db:3306/ideation_portal"

# JWT
JWT_SECRET="32-chars-or-more-random-string"
JWT_REFRESH_SECRET="another-32-chars-or-more-random-string"
JWT_ACCESS_TTL="15m"
JWT_REFRESH_TTL="7d"

# Application
NODE_ENV="development"
PORT="3001"
LOG_LEVEL="info"

# Frontend
NEXT_PUBLIC_API_BASE_URL="http://localhost:3001/api"

# CORS
CORS_ORIGIN="http://localhost:3000"

# File Upload
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE_BYTES="5242880"  # 5MB
MAX_ATTACHMENTS_PER_IDEA="5"
```

**起動時バリデーション (`config/env.validation.ts`)**:
- 必須 env が欠落 → 起動失敗
- `JWT_SECRET` < 32 chars → 起動失敗
- `DATABASE_URL` 形式不正 → 起動失敗

---

## 7. ディレクトリ構造再確認（unit-of-work.md と整合）

```
ai-dlc-demo/
├── docker-compose.yml
├── .env.example                # commit 対象
├── .env                        # gitignore
├── .gitignore
├── README.md
├── package.json (workspaces?)  # → 各サブプロジェクトで個別 (workspaces 不要、3コンテナ独立ビルド)
│
├── backend/                    # NestJS
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── nest-cli.json
│   ├── jest.config.ts
│   ├── .eslintrc.js
│   ├── .prettierrc
│   └── src/...
│
├── frontend/                   # Next.js
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── vitest.config.ts
│   ├── playwright.config.ts
│   └── src/...
│
└── prisma/                     # Schema (backend が利用)
    ├── schema.prisma
    └── migrations/
```

**注**: `prisma/` は backend 配下に置く案もあるが、将来の参照性のためルートに分離。`backend/Dockerfile` で `COPY prisma/` する。

---

## 8. 将来見直し条件

以下の条件が発生したら本選定を見直す:

| 条件 | 影響 |
|---|---|
| ユーザー数 1000 超 | SSE → Redis pub/sub、DB → connection pool 拡大 |
| 本番デプロイ要件発生 | HTTPS 強制、Sentry 等の観測性、CI/CD パイプライン |
| マイクロサービス化 | NestJS Module を独立サービス化、API Gateway 追加 |
| 多言語対応 (i18n) | next-intl / react-intl 導入 |
| ファイル数増 | S3 互換ストレージ (MinIO) へ移行 |
| 認可要件強化 | CASL 等の権限ライブラリ導入 |

これらは現時点では YAGNI、要件発生時に対応。
