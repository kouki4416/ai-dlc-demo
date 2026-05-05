# U0 Shared Foundation — Code Generation Plan (Part 1)

**Date**: 2026-05-05
**Status**: Approved (PR-split strategy added 2026-05-05T11:55Z)
**Unit**: U0 Shared Foundation
**Branch (元)**: `feat/u0-shared-foundation` → **7 PR 直列マージへ変更**
**Target PR**: → `main` (各 PR が main を base とする直列マージ)
**Source**: functional-design / nfr-requirements / nfr-design 全成果物

---

## ★ PR 分割方針（2026-05-05 追加）

レビューしやすい単位で開発するため、Step 1〜23 を **7 PR の直列マージ** に再構成:

| # | ブランチ | 内容 | 対応 Step | 想定ファイル数 |
|---|---|---|---|---|
| **1** | `feat/u0-1-skeleton-prisma` | ルート + Prisma + AI-DLC docs | Step 1, 2 | ~5 |
| **2** | `feat/u0-2-backend-bootstrap` | backend 雛形 + main.ts + config + AppModule + PrismaModule + LoggerModule + 空 SharedModule | Step 3, 4, 5, 6, 7 | ~12 |
| **3** | `feat/u0-3-backend-common` | CommonModule (DTO/Pipe/Filter/Interceptor/Decorator + utils) + 単体テスト | Step 8 (Auth 除く) + Step 12 部分 | ~18 |
| **4** | `feat/u0-4-backend-auth-guards` | JWT strategy + 3 Guards + auth-user types + テスト | Step 8 (Auth) + Step 12 部分 | ~10 |
| **5** | `feat/u0-5-backend-cross-cutting` | Audit + SseHub + Health + SharedModule 統合 + テスト | Step 9, 10, 11 + Step 12 残り | ~14 |
| **6** | `feat/u0-6-frontend-foundation` | frontend 雛形 + globals + lib + types + AuthContext + hooks | Step 13, 14, 15, 16, 17 | ~22 |
| **7** | `feat/u0-7-frontend-components-docs` | shared/ui コンポーネント + テスト + code-summary.md + README 更新 + smoke test 結果 | Step 18, 19, 20, 21, 22 | ~16 |

**運用**: 各 PR は前 PR が main にマージされた後に作成。マージ戦略は **squash merge** (履歴クリーン)。

---

---

## 0. Unit Context

| 項目 | 値 |
|---|---|
| Unit | U0 — Shared Foundation (横断技術ユニット) |
| Stories 担当 | US-007 (ロール別ナビ), US-029 (準リアルタイム更新 SSE Hub) |
| 依存先 | なし (基盤、起点) |
| 依存元 | U1〜U6 全ユニット |
| 完了基準 | docker compose up でアプリ起動 + /health で 200、共通 Module/Pipe/Filter/Guard が DI 可能、FE 共通基盤がエラーなく描画 |
| Workspace Root | `/Users/pank/Workspace/ai-dlc-demo` |
| Code 配置先 | `backend/`, `frontend/`, `prisma/` (workspace root 直下) |
| Doc 配置先 | `aidlc-docs/construction/u0-shared-foundation/code/` (markdown summary のみ) |

---

## 1. ユニットインターフェース・契約（公開 API）

U0 が他ユニットに提供する DI 可能なものすべて (NFR Design `logical-components.md` と整合):

### Backend
- **Modules** (8): SharedModule(@Global) / PrismaModule / LoggerModule / ConfigModule / AuditModule / SseHubModule / HealthModule / CommonModule
- **Services**: PrismaService / AuditService / SseHub / ConfigService
- **Pipes**: ValidationPipe (Global) / ParseCuidPipe
- **Filters**: GlobalExceptionFilter (Global)
- **Interceptors**: LoggerInterceptor / TimingInterceptor (Global)
- **Guards**: JwtAuthGuard / RolesGuard / ResourceOwnerGuard / ThrottlerGuard
- **Decorators**: @Public() / @Roles() / @CurrentUser()
- **DTO Base**: PaginationDto / PaginatedResponseDto / ErrorResponseDto
- **Utils**: hashToken / sanitizeFilename / saveAttachment / roundTo

### Database (prisma/schema.prisma — 全ユニット共有)
- 8 Models: User / RefreshToken / PasswordResetToken / Cycle / Idea / IdeaAttachment / Score / AuditLog
- 4 Enums: UserRole / CycleStatus / IdeaStatus / ScoreStatus

### Frontend
- **app/layout.tsx** (RootLayout)
- **Contexts**: AuthContext (空 token 状態でも動作)
- **Components**: Navigation / Sidebar / Header / AuthGuard / RoleGuard / ErrorBoundary / LoadingSpinner / EmptyState
- **Hooks**: useAuth / useSSE / useApi / useToast
- **Lib**: api-client (axios + JWT interceptor) / sse-client / auth-storage / nav-config / query-client / utils
- **Types**: User / UserRole / ApiResponse / ErrorResponse / PaginatedResponse / SseEventName / SseEventMap

---

## 2. 詳細生成ステップ（順次実行）

### Step 1: ルート構成 — Docker Compose / プロジェクト雛形

- [x] Step 1.1: ルート `docker-compose.yml` (3 service: frontend / backend / db)
- [x] Step 1.2: ルート `.env.example` (DATABASE_URL / JWT_SECRET / 他)
- [x] Step 1.3: ルート `package.json` 不要 — 各 service 配下で個別管理 (workspaces 不採用)
- [x] Step 1.4: ルート `.dockerignore`

### Step 2: Prisma Schema (DB)

- [x] Step 2.1: `prisma/schema.prisma` (8 Models / 4 Enums / 全フィールド・制約・インデックス)
- [x] Step 2.2: `prisma/seed.ts` (開発用 seed: ADMIN ユーザー 1 + Cycle 1)

### Step 3: Backend — プロジェクト雛形

- [x] Step 3.1: `backend/package.json` (NestJS 10 + Prisma + 全依存)
- [x] Step 3.2: `backend/tsconfig.json` + `tsconfig.build.json` (strict ON, target ES2022)
- [x] Step 3.3: `backend/nest-cli.json`
- [x] Step 3.4: ESLint + Prettier 設定 (config-protection hook により package.json 内 `eslintConfig` / `prettier` フィールドへ統合)
- [x] Step 3.5: `backend/jest.config.ts` (coverage threshold 70%)
- [x] Step 3.6: `backend/Dockerfile` (multi-stage: base / deps / dev / build / prod)

### Step 4: Backend — エントリポイント & 設定

- [x] Step 4.1: `backend/src/main.ts` (bootstrap + helmet + CORS + Global Pipe/Filter/Interceptor + ValidationPipe + Swagger)
- [x] Step 4.2: `backend/src/app.module.ts` (SharedModule 1箇所 import、後続ユニット用 placeholder コメント)
- [x] Step 4.3: `backend/src/config/env.validation.ts` (class-validator schema)
- [x] Step 4.4: `backend/src/config/config.module.ts` (@nestjs/config wrapper)

### Step 5: Backend — SharedModule (@Global)

- [ ] Step 5.1: `backend/src/shared/shared.module.ts`

### Step 6: Backend — PrismaModule

- [ ] Step 6.1: `backend/src/shared/prisma/prisma.service.ts` (extends PrismaClient + OnModuleInit/Destroy)
- [ ] Step 6.2: `backend/src/shared/prisma/prisma.module.ts`

### Step 7: Backend — LoggerModule (pino + redact)

- [ ] Step 7.1: `backend/src/shared/logger/logger.module.ts` (nestjs-pino 設定 + redact paths + level)

### Step 8: Backend — CommonModule (DTOs / Pipes / Filters / Interceptors / Decorators)

- [ ] Step 8.1: `backend/src/shared/common/dto/pagination.dto.ts`
- [ ] Step 8.2: `backend/src/shared/common/dto/paginated-response.dto.ts`
- [ ] Step 8.3: `backend/src/shared/common/dto/error-response.dto.ts`
- [ ] Step 8.4: `backend/src/shared/common/pipes/parse-cuid.pipe.ts`
- [ ] Step 8.5: `backend/src/shared/common/filters/global-exception.filter.ts` (Prisma error → HTTP マッピング)
- [ ] Step 8.6: `backend/src/shared/common/interceptors/logger.interceptor.ts`
- [ ] Step 8.7: `backend/src/shared/common/interceptors/timing.interceptor.ts`
- [ ] Step 8.8: `backend/src/shared/common/decorators/public.decorator.ts`
- [ ] Step 8.9: `backend/src/shared/common/decorators/roles.decorator.ts`
- [ ] Step 8.10: `backend/src/shared/common/decorators/current-user.decorator.ts`
- [ ] Step 8.11: `backend/src/shared/common/guards/jwt-auth.guard.ts` (passport-jwt strategy)
- [ ] Step 8.12: `backend/src/shared/common/guards/roles.guard.ts`
- [ ] Step 8.13: `backend/src/shared/common/guards/resource-owner.guard.ts` (factory)
- [ ] Step 8.14: `backend/src/shared/common/strategies/jwt.strategy.ts`
- [ ] Step 8.15: `backend/src/shared/common/types/auth-user.ts` (req.user 型)
- [ ] Step 8.16: `backend/src/shared/common/utils/hash-token.ts`
- [ ] Step 8.17: `backend/src/shared/common/utils/sanitize-filename.ts`
- [ ] Step 8.18: `backend/src/shared/common/utils/file-storage.ts`
- [ ] Step 8.19: `backend/src/shared/common/utils/round-to.ts`
- [ ] Step 8.20: `backend/src/shared/common/common.module.ts`

### Step 9: Backend — AuditModule

- [ ] Step 9.1: `backend/src/shared/audit/audit.service.ts` (log / findMany)
- [ ] Step 9.2: `backend/src/shared/audit/audit.module.ts`
- [ ] Step 9.3: `backend/src/shared/audit/audit.types.ts` (AuditAction enum 10 種)

### Step 10: Backend — SseHubModule

- [ ] Step 10.1: `backend/src/shared/sse/sse-hub.service.ts` (EventEmitter wrapper + publish/subscribe)
- [ ] Step 10.2: `backend/src/shared/sse/sse.controller.ts` (GET /api/events + Heartbeat)
- [ ] Step 10.3: `backend/src/shared/sse/sse-event.types.ts` (SseEventMap)
- [ ] Step 10.4: `backend/src/shared/sse/sse.module.ts`

### Step 11: Backend — HealthModule

- [ ] Step 11.1: `backend/src/shared/health/health.controller.ts` (3 endpoints)
- [ ] Step 11.2: `backend/src/shared/health/prisma-health.indicator.ts` (terminus)
- [ ] Step 11.3: `backend/src/shared/health/health.module.ts`

### Step 12: Backend — Unit Tests (U0 提供物)

- [ ] Step 12.1: `backend/src/shared/common/utils/__tests__/hash-token.spec.ts`
- [ ] Step 12.2: `backend/src/shared/common/utils/__tests__/sanitize-filename.spec.ts`
- [ ] Step 12.3: `backend/src/shared/common/utils/__tests__/round-to.spec.ts`
- [ ] Step 12.4: `backend/src/shared/common/filters/__tests__/global-exception.filter.spec.ts`
- [ ] Step 12.5: `backend/src/shared/sse/__tests__/sse-hub.service.spec.ts`
- [ ] Step 12.6: `backend/src/shared/audit/__tests__/audit.service.spec.ts`
- [ ] Step 12.7: `backend/src/shared/common/decorators/__tests__/public.decorator.spec.ts`

### Step 13: Frontend — プロジェクト雛形

- [ ] Step 13.1: `frontend/package.json` (Next.js 14 + React 18 + Tailwind + 全依存)
- [ ] Step 13.2: `frontend/tsconfig.json` (strict ON, paths alias `@/*`)
- [ ] Step 13.3: `frontend/next.config.ts`
- [ ] Step 13.4: `frontend/tailwind.config.ts` + `frontend/postcss.config.js` + `frontend/components.json` (shadcn)
- [ ] Step 13.5: `frontend/.eslintrc.json` (Next preset + jsx-a11y)
- [ ] Step 13.6: `frontend/.prettierrc`
- [ ] Step 13.7: `frontend/vitest.config.ts` (coverage 80%)
- [ ] Step 13.8: `frontend/playwright.config.ts`
- [ ] Step 13.9: `frontend/Dockerfile`

### Step 14: Frontend — グローバル & Provider

- [ ] Step 14.1: `frontend/src/app/globals.css` (Tailwind base)
- [ ] Step 14.2: `frontend/src/app/layout.tsx` (RootLayout + AuthProvider + QueryClientProvider + Toaster)
- [ ] Step 14.3: `frontend/src/app/page.tsx` (ホーム — 認証状態でリダイレクト)
- [ ] Step 14.4: `frontend/src/app/error.tsx` (グローバルエラー UI)
- [ ] Step 14.5: `frontend/src/app/not-found.tsx`
- [ ] Step 14.6: `frontend/src/middleware.ts` (Next.js auth リダイレクト最低限)

### Step 15: Frontend — 共通型・設定

- [ ] Step 15.1: `frontend/src/types/user.ts`
- [ ] Step 15.2: `frontend/src/types/api.ts`
- [ ] Step 15.3: `frontend/src/types/sse.ts`
- [ ] Step 15.4: `frontend/src/lib/utils.ts` (cn helper)
- [ ] Step 15.5: `frontend/src/lib/auth-storage.ts`
- [ ] Step 15.6: `frontend/src/lib/api-client.ts` (axios + JWT interceptor + 401 refresh)
- [ ] Step 15.7: `frontend/src/lib/sse-client.ts`
- [ ] Step 15.8: `frontend/src/lib/nav-config.ts`
- [ ] Step 15.9: `frontend/src/lib/query-client.ts`

### Step 16: Frontend — Context

- [ ] Step 16.1: `frontend/src/contexts/AuthContext.tsx`

### Step 17: Frontend — Hooks

- [ ] Step 17.1: `frontend/src/hooks/useAuth.ts`
- [ ] Step 17.2: `frontend/src/hooks/useSSE.ts`
- [ ] Step 17.3: `frontend/src/hooks/useApi.ts`
- [ ] Step 17.4: `frontend/src/hooks/useToast.ts`

### Step 18: Frontend — 共通コンポーネント

- [ ] Step 18.1: `frontend/src/components/shared/Navigation.tsx`
- [ ] Step 18.2: `frontend/src/components/shared/Sidebar.tsx`
- [ ] Step 18.3: `frontend/src/components/shared/Header.tsx`
- [ ] Step 18.4: `frontend/src/components/shared/AuthGuard.tsx`
- [ ] Step 18.5: `frontend/src/components/shared/RoleGuard.tsx`
- [ ] Step 18.6: `frontend/src/components/shared/ErrorBoundary.tsx`
- [ ] Step 18.7: `frontend/src/components/shared/LoadingSpinner.tsx`
- [ ] Step 18.8: `frontend/src/components/shared/EmptyState.tsx`
- [ ] Step 18.9: `frontend/src/components/ui/button.tsx` (shadcn 風)
- [ ] Step 18.10: `frontend/src/components/ui/input.tsx`
- [ ] Step 18.11: `frontend/src/components/ui/dialog.tsx`
- [ ] Step 18.12: `frontend/src/components/ui/form.tsx`
- (注: 主要 shadcn コンポーネントを最低限配置、追加は後続ユニットで)

### Step 19: Frontend — Unit Tests

- [ ] Step 19.1: `frontend/src/lib/__tests__/sanitize-filename.test.ts` (BE と対称、FE 側 zod ルール検証)
- [ ] Step 19.2: `frontend/src/components/shared/__tests__/AuthGuard.test.tsx`
- [ ] Step 19.3: `frontend/src/components/shared/__tests__/RoleGuard.test.tsx`
- [ ] Step 19.4: `frontend/src/contexts/__tests__/AuthContext.test.tsx`
- [ ] Step 19.5: `frontend/src/hooks/__tests__/useSSE.test.ts`

### Step 20: Documentation Generation

- [ ] Step 20.1: `aidlc-docs/construction/u0-shared-foundation/code/code-summary.md` (生成ファイル一覧 + 主要決定の再記)
- [ ] Step 20.2: ルート `README.md` 更新 (セットアップ手順を実コマンドに更新)

### Step 21: Deployment Artifacts

- [ ] Step 21.1: `docker-compose.yml` 動作確認 (`docker compose config`)

### Step 22: ローカル検証 (smoke test)

- [ ] Step 22.1: `cd backend && npm install` 成功確認
- [ ] Step 22.2: `cd frontend && npm install` 成功確認
- [ ] Step 22.3: `npx prisma format` でスキーマ妥当性確認
- [ ] Step 22.4: `cd backend && npx tsc --noEmit` で型チェック
- [ ] Step 22.5: `cd frontend && npx tsc --noEmit` で型チェック
- [ ] Step 22.6: `cd backend && npm test` で Unit Tests 通過確認 (U0 提供物のみ)
- [ ] Step 22.7: `cd frontend && npm test` で Unit Tests 通過確認

注: Step 22 でエラーが出た場合は該当 Step に戻って修正。`docker compose up` での E2E 起動確認は Build and Test ステージで実施 (本ステージスコープ外)。

### Step 23: PR 準備

- [ ] Step 23.1: `git add` 対象ファイル明示 (`.env` 等の機密含めない)
- [ ] Step 23.2: Conventional Commit でコミット (例: `feat(u0): scaffold shared foundation module with prisma, auth, sse hub`)
- [ ] Step 23.3: `git push -u origin feat/u0-shared-foundation`
- [ ] Step 23.4: `gh pr create --base main --head feat/u0-shared-foundation --title "feat(u0): shared foundation" --body "<descriptive body referencing artifacts>"`
- [ ] Step 23.5: PR URL をユーザーに提示

---

## 3. Story Traceability

| Story | 実装箇所 |
|---|---|
| US-007 ロール別ナビゲーション | `frontend/src/components/shared/Navigation.tsx` + `frontend/src/lib/nav-config.ts` (項目登録 API、後続ユニットが register) |
| US-029 準リアルタイム更新 (SSE Hub) | `backend/src/shared/sse/sse-hub.service.ts` + `backend/src/shared/sse/sse.controller.ts` + `frontend/src/hooks/useSSE.ts` + `frontend/src/lib/sse-client.ts` |

両 Story を **U0 で完結** させる (後続ユニットは Publisher/Consumer として基盤を利用するのみ)。

---

## 4. 依存・前提

- 依存先ユニット: なし (起点)
- 必須環境: Node 20+ / Docker / Docker Compose v2
- 環境変数: `.env.example` を `.env` にコピーして編集 (DATABASE_URL / JWT_SECRET 等)

---

## 5. PR 内容（予定）

**Title**: `feat(u0): shared foundation`

**Body**:
```
## Summary
- Scaffold project: docker-compose, Prisma schema, NestJS backend, Next.js frontend
- U0 Shared Foundation: PrismaModule, LoggerModule, CommonModule (DTO/Pipe/Filter/Interceptor/Decorator/Guard/Util), AuditModule, SseHubModule, HealthModule
- Frontend Shared Foundation: RootLayout, AuthContext, AuthGuard/RoleGuard, api-client, sse-client, nav-config, common hooks
- Story US-007 (role-based navigation), US-029 (SSE hub) implemented

## Story Coverage
- US-007: role-based navigation (registerNavItem API in lib/nav-config.ts)
- US-029: real-time updates (SSE hub in shared/sse + useSSE hook)

## Test plan
- [ ] backend: `npm test` passes (U0 unit tests)
- [ ] frontend: `npm test` passes (U0 component/hook tests)
- [ ] backend: `npx tsc --noEmit` no errors
- [ ] frontend: `npx tsc --noEmit` no errors
- [ ] `npx prisma format` succeeds
- [ ] Manual: `docker compose up` starts all 3 services (deferred to Build & Test stage)
```

---

## 6. 完了基準（Code Generation Stage）

- [ ] Step 1〜22 すべて [x]
- [ ] Step 22 (smoke test) 全項目 pass
- [ ] PR 作成 + URL 取得
- [ ] ユーザーが Code Generation を承認

---

## 📋 ユーザーアクション

このプランを確認してください:
- 全 23 Steps、約 90+ ファイル生成 (backend ~50, frontend ~40, root ~5, docs ~2)
- 全 Steps をシーケンシャル実行 (Step 1 から順に)
- Step 22 で smoke test、Step 23 で PR 作成

**進めて良ければ → "approve" / "OK"**
**修正したい Step / 範囲があれば → 該当 Step 番号と変更内容を返してください**

承認後、AI が Step 1 から順次実行し、各 Step 完了ごとに本プラン中のチェックボックスを `[x]` に更新します。
