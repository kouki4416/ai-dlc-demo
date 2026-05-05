# Component Dependencies — Ideation Portal

**Date**: 2026-05-03
**Scope**: コンポーネント間の依存関係、通信パターン、データフロー
**Source**: `components.md` + `services.md`

---

## 依存マトリックス（Backend NestJS Modules）

依存方向: 行 → 列（行のモジュールが列のモジュールに依存する）

| ↓ from \ to → | Auth | Users | Ideas | Eval | Cycles | Dashboard | Recog | Admin | Prisma | Common |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| **Auth** | — | ✅ | — | — | — | — | — | — | ✅ | ✅ |
| **Users** | — | — | — | — | — | — | — | — | ✅ | ✅ |
| **Ideas** | guard | guard | — | — | ✅ | event | — | — | ✅ | ✅ |
| **Evaluations** | guard | guard | ✅ | — | ✅ | event | — | — | ✅ | ✅ |
| **Cycles** | guard | — | ✅ | ✅ | — | event | — | — | ✅ | ✅ |
| **Dashboard** | guard | — | ✅ | ✅ | ✅ | — | — | — | ✅ | ✅ |
| **Recognition** | guard | — | ✅ | — | ✅ | — | — | — | ✅ | ✅ |
| **Admin** | guard | ✅ | ✅ | — | ✅ | event | — | — | ✅ | ✅ |
| **PrismaModule** | — | — | — | — | — | — | — | — | — | — |
| **CommonModule** | — | — | — | — | — | — | — | — | — | — |

凡例:
- ✅ — 直接の Service 依存（DI）
- guard — AuthModule の Guard を `@UseGuards(JwtAuthGuard, RolesGuard)` でデコレータ経由参照
- event — `EventEmitter2` 経由で SSE/Dashboard にイベント発火（疎結合）
- — 依存なし

**循環依存なし**: 上三角になっており、`Recognition → Cycles ← Admin` 等はあるが循環なし。

---

## 通信パターン

### 同期 (In-process Service Call)
- **Auth/Users**: `AuthService.login()` が `UsersService.findByEmail()` を直接呼ぶ
- **Ideas/Cycles**: `IdeasService.listPublishedIdeas()` が `CyclesService.getActiveCycle()` でアクティブサイクル ID 取得
- **Cycles/Evaluations**: `CyclesService.closeCycle()` が `EvaluationsService.getAllFinalizedScores()` で集計用データ取得
- **Admin/Users**: `AdminService.appointPanel()` が `UsersService.changeRole()` に委譲

### 非同期 (Event-driven via NestJS EventEmitter2)
- **Producer → Consumer**:
  - `IdeasService.publishIdea` → emit `idea.published` → SseService
  - `EvaluationsService.finalize` → emit `evaluation.finalized` → SseService + DashboardService（キャッシュ無効化）
  - `CyclesService.closeCycle` → emit `cycle.closed` → SseService + RecognitionService（キャッシュ更新）
  - `AdminService.removeIdea` → emit `idea.removed` → SseService

### 永続化 (DB 経由)
- 全 Module は `PrismaService` 経由で MySQL にアクセス
- トランザクションは `prisma.$transaction([...])` または `prisma.$transaction(async (tx) => {...})`

### HTTP (External / Browser)
- フロントエンドからは `fetch` ベースの REST 呼び出し
- SSE は `EventSource` API でブラウザから接続
- JWT は `Authorization: Bearer <token>` ヘッダで送信、Refresh 時のみ Cookie or Body

---

## データフロー（主要シナリオ）

### Flow 1: アイデア投稿 → 評価 → 集計 → 表彰

```
[Submitter Browser]                 [NestJS Backend]                    [MySQL]
       |                                    |                              |
       | POST /ideas/:id/publish            |                              |
       |----------------------------------->|                              |
       |                                    | IdeasService.publishIdea     |
       |                                    | -> Prisma update Idea        |
       |                                    |----------------------------->|
       |                                    |<----- OK --------------------|
       |                                    | emit 'idea.published'        |
       |<----- 200 OK + IdeaDto ------------|                              |
       |                                    | (async) SseService -> push   |
       |                                    |     to Dashboard subscribers |
       |                                    |                              |
[Panel Member Browser]                                                     |
       | GET /evaluations/queue                                            |
       |---------------------------------->|                               |
       |                                   | EvaluationsService.getQueue   |
       |                                   |------------------------------>|
       |                                   |<--- queue items + status -----|
       |<--- 200 OK + queue ---------------|                               |
       | POST /evaluations/idea/:id/finalize                               |
       |---------------------------------->|                               |
       |                                   | EvaluationsService.finalize   |
       |                                   | -> emit 'evaluation.finalized'|
       |                                   |                               |
[Admin Browser]                                                            |
       | POST /cycles/:id/close                                            |
       |---------------------------------->|                               |
       |                                   | CyclesService.closeCycle      |
       |                                   |  +-----------------------+    |
       |                                   |  | Transaction:          |    |
       |                                   |  | 1. AggregationService |    |
       |                                   |  | 2. Determine Top 3    |    |
       |                                   |  | 3. Reveal Top 3 author|    |
       |                                   |  | 4. Cycle status=CLOSED|    |
       |                                   |  +-----------------------+    |
       |                                   |  -> emit 'cycle.closed'       |
       |<--- 200 OK + winners --------------|                              |
       |                                   | SseService -> push to all     |
       |                                   |     dashboard/recognition users|
```

### Flow 2: SSE リアルタイム更新

```
[Browser Dashboard]                  [NestJS]                       [Other Users' Actions]
       |                                |                                  |
       | GET /dashboard/stream          |                                  |
       |  (Accept: text/event-stream)   |                                  |
       |------------------------------->|                                  |
       |<==== Connection Open ==========|                                  |
       |                                |                                  |
       |                                |  <-- 'evaluation.finalized' -----|
       |                                |                                  |
       |<------ event: evaluation ------|                                  |
       |        data: {ideaId, ...}     |                                  |
       |                                |                                  |
       |  (Browser refetches            |                                  |
       |   /dashboard/leaderboard)      |                                  |
       |------------------------------->|                                  |
       |<--- 200 OK + updated ranks ----|                                  |
       |                                |                                  |
       |                                |  <-- 'cycle.closed' -------------|
       |                                |                                  |
       |<------ event: cycle -----------|                                  |
       |        data: {cycleId, winners}|                                  |
```

### Flow 3: 認証 + JWT リフレッシュ

```
[Browser]                             [NestJS]                       [MySQL]
   |                                      |                              |
   | POST /auth/login                     |                              |
   |  {email, password}                   |                              |
   |------------------------------------->|                              |
   |                                      | UsersService.findByEmail     |
   |                                      |----------------------------->|
   |                                      |<--- User record -------------|
   |                                      | bcrypt.compare(...)          |
   |                                      | jwt.sign() x 2               |
   |                                      | save RefreshToken            |
   |                                      |----------------------------->|
   |<--- 200 + {access, refresh} --------|                              |
   |                                      |                              |
   | (15分後) GET /ideas                  |                              |
   |  (Authorization: Bearer access)      |                              |
   |------------------------------------->|                              |
   |<--- 401 Unauthorized ---------------|                              |
   |                                      |                              |
   | POST /auth/refresh                   |                              |
   |  {refreshToken}                      |                              |
   |------------------------------------->|                              |
   |                                      | validate refresh + lookup    |
   |                                      |----------------------------->|
   |                                      |<--- valid -------------------|
   |                                      | jwt.sign() new access        |
   |<--- 200 + {access} -----------------|                              |
   |                                      |                              |
   | GET /ideas (Authorization: Bearer)   |                              |
   |------------------------------------->|                              |
   |<--- 200 + ideas --------------------|                              |
```

---

## 依存方向の原則

1. **Auth → Users → Ideas → Evaluations → Cycles → Recognition** の単方向（読み取り順）
2. **Dashboard / Admin** は他のドメインモジュールに依存可だが、逆参照されない
3. **Common / Prisma** は全モジュールから依存される基盤
4. **EventEmitter による疎結合**: Producer は Consumer の存在を意識しない
5. **Repository は Module 内部にカプセル化**: 他 Module から DB 直接参照はせず、Service 経由

---

## 起動順序とライフサイクル

NestJS の DI コンテナが以下の順序でモジュールを初期化:

1. CommonModule（globalProviders、デコレータ、フィルタ）
2. PrismaModule（DB connection establishment）
3. UsersModule, AuthModule（基盤の認証/ユーザー）
4. IdeasModule, CyclesModule
5. EvaluationsModule, RecognitionModule
6. DashboardModule（SSE 含む）
7. AdminModule
8. AppModule（全モジュール統合 + EventEmitter 初期化）

**Graceful Shutdown**: `OnModuleDestroy` で SSE 接続クローズ、Prisma `$disconnect()`、進行中 cycle close の完了待ち。
