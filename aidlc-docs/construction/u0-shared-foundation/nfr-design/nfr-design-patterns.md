# U0 — NFR Design Patterns

**Date**: 2026-05-05
**Status**: Approved
**Source**: nfr-design-plan Q1〜Q14 / nfr-requirements.md / functional-design/*.md

このドキュメントは U0 が採用する **設計パターン** を、満たすべき NFR とともに整理します。後続ユニットはこれらのパターンを継承・準拠します。

---

## 1. Resilience Patterns（耐障害性）

### Pattern R-1: Fail-Fast（失敗即返却）
- **採用箇所**: 全 Backend API
- **実装**: NestJS の Exception を即座に投げる、リトライしない
- **対応 NFR**: REL-006 (エラー伝搬の明確化)
- **コードスケッチ**:
```typescript
async createIdea(dto: CreateIdeaDto, userId: string) {
    const cycle = await this.cycleService.findActiveCycle()
    if (!cycle) throw new ConflictException({ code: 'NO_ACTIVE_CYCLE' })  // fail-fast
    return this.repo.create({ ...dto, submitterId: userId, cycleId: cycle.id })
}
```
- **理由**: PoC、外部依存ゼロ、リトライ判断はクライアント側で

### Pattern R-2: Client-Side Queue + Backoff（FE ドラフト保存）
- **採用箇所**: FE ドラフト自動保存 (BR-IDEA-004)
- **実装**:
  1. メモリキューに更新を積む
  2. 5 秒間アイドル後に flush
  3. 失敗時は exponential backoff (3s, 9s, 27s, max 60s)
  4. localStorage に未送信差分を persist (タブ閉じ・クラッシュ対策)
  5. ロード時に localStorage からリストアして送信
- **対応 NFR**: REL-002 (ドラフト保存信頼性)
- **コードスケッチ**:
```typescript
// hooks/useDraftAutoSave.ts (U2 で実装、U0 が hook 基盤を提供)
const queue = new DraftQueue({ storage: 'idea-draft-' + ideaId })
useEffect(() => {
    queue.enqueue(formData)
    const t = setTimeout(() => queue.flush(api.saveDraft), 5000)
    return () => clearTimeout(t)
}, [formData])
```

### Pattern R-3: Atomic Transaction（DB トランザクション境界）
- **採用箇所** (Q9 確定):
  - Cycle 終了処理 (集計 + ranking + status + AuditLog)
  - 不適切投稿削除 (Idea status + AuditLog)
  - ロール変更 (User update + AuditLog)
  - パスワードリセット完了 (passwordHash + RT 全失効 + ResetToken usedAt + AuditLog)
  - Refresh Token Rotation (旧 RT revoke + 新 RT create)
- **実装**: `prisma.$transaction(async tx => {...})` で囲む、SSE publish は **トランザクション完了後**
- **対応 NFR**: REL-003 (DB トランザクション)
- **コードスケッチ**:
```typescript
async closeCycle(cycleId: string, byUserId: string) {
    const result = await this.prisma.$transaction(async tx => {
        const cycle = await tx.cycle.findFirstOrThrow({ where: { id: cycleId, status: 'OPEN' } })
        const top3 = await this.aggregateAndRank(tx, cycleId)
        await tx.cycle.update({ where: { id: cycleId }, data: { status: 'CLOSED', closedAt: new Date(), top3IdeaIds: top3 } })
        await tx.auditLog.create({ data: { userId: byUserId, action: 'CYCLE_CLOSE', targetType: 'Cycle', targetId: cycleId, metadata: { top3IdeaIds: top3 } } })
        return { cycle, top3 }
    })
    this.sseHub.publish('cycle.closed', { cycleId, top3: result.top3 })  // after commit
    return result
}
```

### Pattern R-4: SSE Heartbeat + Native Reconnect
- **採用箇所**: U0 SseHubModule
- **実装**:
  - 15 秒ごと heartbeat (`: ping\n\n`)
  - 5 分間 heartbeat 応答なし → サーバ側で subscriber 解除
  - クライアント側は EventSource ネイティブの自動再接続 (ブラウザ標準 3 秒間隔)
- **対応 NFR**: PERF-003, REL-002

---

## 2. Scalability Patterns（拡張性）

### Pattern S-1: In-Memory EventEmitter（SSE Pub/Sub）
- **採用箇所**: U0 SseHubModule
- **実装**: `node:events` の EventEmitter で publish/subscribe
- **対応 NFR**: SCALE-001 (単一プロセス) / PERF-007 (インメモリ EventEmitter)
- **将来見直し条件**: ユーザー 1000 超 → Redis Pub/Sub
- **コードスケッチ**:
```typescript
@Injectable()
export class SseHub {
    private emitter = new EventEmitter()
    publish<E extends keyof SseEventMap>(event: E, payload: SseEventMap[E]) { this.emitter.emit(event, payload) }
    subscribe(events: string[], handler: (event: string, data: any) => void) {
        events.forEach(e => this.emitter.on(e, payload => handler(e, payload)))
        return () => events.forEach(e => this.emitter.off(e, handler))
    }
}
```

### Pattern S-2: Module Boundary（将来分割可能性の確保）
- **採用箇所**: NestJS Module 境界
- **実装**: 各ユニットは独立した Module、Service-to-Service のみで通信、Repository を export しない
- **対応 NFR**: SCALE-003 (将来マイクロサービス化余地)

### Pattern S-3: Connection Pool（DB）
- **採用箇所**: Prisma の DB 接続
- **実装**: `DATABASE_URL?connection_limit=DEFAULT` (CPU*2+1)
- **対応 NFR**: PERF-006 (DB Pool)

---

## 3. Performance Patterns（性能）

### Pattern P-1: On-the-Fly Aggregation（オンザフライ集計）
- **採用箇所**: ダッシュボードのリーダーボード集計
- **実装**: 各 GET でその時点の Score 集計を実行、materialized view 不使用
- **対応 NFR**: PERF-004/005 (API p95/p99)
- **理由**: 100 ユーザー × 100 Idea × 1万 Score 規模では MySQL groupBy で 100ms 以内
- **コードスケッチ**:
```typescript
async getLeaderboard(cycleId: string) {
    const ideas = await this.prisma.idea.findMany({ where: { cycleId, status: 'PUBLISHED' } })
    const aggregates = await this.prisma.score.groupBy({
        by: ['ideaId'],
        where: { cycleId, status: 'CONFIRMED' },
        _avg: { feasibility: true, impact: true, innovation: true },
        _count: true,
    })
    return ideas.map(idea => mergeAggregate(idea, aggregates))
}
```

### Pattern P-2: SSE Invalidate-Trigger（FE 側のキャッシュ無効化）
- **採用箇所**: FE のリーダーボード/詳細ページ
- **実装**: SSE event 受信 → TanStack Query の `invalidateQueries` を呼んで再フェッチ
- **対応 NFR**: PERF-003 (SSE 30 秒以内反映)
- **コードスケッチ**:
```typescript
useSSE(['idea.published', 'score.confirmed'], (event) => {
    if (event === 'idea.published') queryClient.invalidateQueries(['leaderboard'])
    if (event === 'score.confirmed') queryClient.invalidateQueries(['leaderboard', 'idea-detail'])
})
```

### Pattern P-3: Selective Loading（Prisma include / select）
- **採用箇所**: Repository 層全般
- **実装**: 必要なフィールド/リレーションのみ select、N+1 回避のための明示 include
- **対応 NFR**: PERF-004/005
- **規約**: 「とりあえず全部 include」を禁止、利用 use case ごとに最小取得

### Pattern P-4: Index-First DB Design
- **採用箇所**: domain-entities.md 定義済 12 indexes
- **対応 NFR**: PERF-004/005

### Pattern P-5: Render Mode Selection（Next.js）
- **採用箇所**: FE 全ページ
- **実装** (Q14):
  - 認証ページ: SSR (Server Component)
  - 認証必須ページ (Dashboard / Detail / Admin): CSR (Client Component + AuthGuard)
- **対応 NFR**: PERF-002 (ページロード)

---

## 4. Security Patterns（セキュリティ）

### Pattern SEC-1: Guard Chain（認可カスケード）
- **採用箇所**: 全 Controller
- **実装** (Q6):
```
Request
  ↓
[ThrottlerGuard]   ← 認証エンドポイントのみ (5 req/min/IP)
  ↓
[JwtAuthGuard]     ← Bearer token 検証 (デフォルト全)
  ↓
[RolesGuard]       ← @Roles() 照合
  ↓
[ResourceOwnerGuard] ← 自分の Idea/Score 制限 (必要箇所のみ)
  ↓
Handler
```
- **対応 NFR**: SEC-007/009/010
- **Decorator API**:
  - `@Public()` — JwtAuthGuard スキップ
  - `@Roles(UserRole.ADMIN)` — ロール宣言
  - `@CurrentUser()` — req.user 抽出

### Pattern SEC-2: Constant-Time Comparison（パスワード）
- **採用箇所**: AuthService.login
- **実装**: `bcrypt.compare()` を直接利用 (内部で constant-time)、自前 `===` 比較禁止
- **対応 NFR**: SEC-002

### Pattern SEC-3: Generic Error Messages（情報漏洩防止）
- **採用箇所**: AuthService
- **実装**: ユーザー存在/非存在を区別しない「メールまたはパスワードが正しくない」を返す
- **対応 NFR**: SEC-002

### Pattern SEC-4: Token Hashing（DB 保存）
- **採用箇所**: RefreshToken / PasswordResetToken
- **実装**: 生 token は **DB に保存しない**、`crypto.createHash('sha256').update(token).digest('hex')` の hash を保存
- **対応 NFR**: SEC-002 / SEC-014
- **コードスケッチ**:
```typescript
const refreshToken = jwt.sign({ sub: userId }, JWT_REFRESH_SECRET, { expiresIn: '7d' })
const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex')
await prisma.refreshToken.create({ data: { userId, tokenHash, expiresAt: ... } })
return refreshToken  // 生 token はクライアントへ返却のみ
```

### Pattern SEC-5: Refresh Token Rotation
- **採用箇所**: AuthService.refresh
- **実装** (Q9 R-3 と統合): 旧 RT を `revokedAt=now()`、新 RT を発行 (atomic)
- **盗難検出**: 失効済 RT 再利用検出時 → 当該ユーザーの全 RT 強制失効
- **対応 NFR**: SEC-002

### Pattern SEC-6: Path Traversal Prevention（ファイル保存）
- **採用箇所**: U2 ファイルアップロード (U0 が util 提供)
- **実装**:
  - filename を sanitize: 英数 / `-` / `_` / `.` 以外を除去
  - storedPath を `uploads/{ideaId}/{cuid}-{sanitized-filename}` に固定
  - upload ディレクトリへの絶対パス chroot
- **対応 NFR**: SEC-013

### Pattern SEC-7: Field Exclusion（レスポンス）
- **採用箇所**: User entity → DTO 変換
- **実装**: `class-transformer` の `@Exclude()` で `passwordHash` 等を除外
- **対応 NFR**: SEC-002

### Pattern SEC-8: Log Redaction
- **採用箇所**: pino logger
- **実装** (Q10):
```typescript
{
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'req.body.password',
            'req.body.newPassword', 'req.body.refreshToken', 'req.body.token',
            '*.passwordHash', '*.refreshToken', '*.tokenHash'],
    censor: '[REDACTED]'
  }
}
```
- **対応 NFR**: SEC-014

### Pattern SEC-9: helmet + CORS + Rate Limit
- **採用箇所**: main.ts (NestJS bootstrap)
- **実装**:
```typescript
app.use(helmet())
app.enableCors({ origin: process.env.CORS_ORIGIN, credentials: true })
// ThrottlerGuard を AuthController のみに適用
```
- **対応 NFR**: SEC-009/010/011

### Pattern SEC-10: Anonymity at API Layer（匿名化 by API）
- **採用箇所**: Idea 取得 API
- **実装**: Cycle OPEN 中は API レスポンスから submitter 関連フィールドを除外。DB には常に保持。
- **対応 NFR**: SEC-007 / FR-5
- **責務分担**: Service が `findAnonymized()` メソッドを提供、Controller が role + cycle status で振り分け

### Pattern SEC-11: Authorization Test Suite（認可テスト）
- **採用箇所**: E2E (Build and Test ステージ、各ユニットでも実装)
- **実装** (Q8): 6 シナリオの認可テストケース
- **対応 NFR**: SEC-007 (認可テスト必須)

---

## 5. Maintainability / Testability Patterns

### Pattern M-1: Test Pyramid（75/20/5）
- **採用箇所**: 全ユニット
- **実装** (Q11):
  - Unit: Service / Repository / Validator / 集計ロジック → 75%
  - Integration: Module の主要 API + 認可テスト → 20%
  - E2E: 各 Epic の golden path 6 本 → 5%
- **対応 NFR**: TEST-001 (カバレッジ 80%)

### Pattern M-2: Test Container DB
- **採用箇所**: Integration テスト
- **実装** (Q12): testcontainers の MySQL イメージを各テストファイル前に起動、各テスト前にクリーンアップ
- **対応 NFR**: TEST-001

### Pattern M-3: AAA Test Structure
- **採用箇所**: 全テスト
- **実装**: Arrange → Act → Assert を明示コメントで分離
- **対応 NFR**: TEST-008

### Pattern M-4: Layered Architecture
- **採用箇所** (Q13): 全 NestJS Module
- **実装**: Controller → Service → Repository の単方向依存、レイヤー越境禁止
- **対応 NFR**: MAINT-008

### Pattern M-5: ESLint Custom Rules
- **採用箇所**: 全 TypeScript ファイル
- **実装**: `max-lines: 800`, `max-lines-per-function: 50`, strict TypeScript rules
- **対応 NFR**: MAINT-002/003

### Pattern M-6: Env Validation at Bootstrap
- **採用箇所**: NestJS main.ts
- **実装**: `class-validator` で env スキーマ検証、欠落 → 起動失敗
- **対応 NFR**: MAINT-007

---

## 6. NFR ↔ Pattern マッピング

| NFR | 採用パターン |
|---|---|
| PERF-001 (100 同時) | S-1, S-3 |
| PERF-002 (ページロード <2s) | P-5 |
| PERF-003 (SSE <30s) | R-4, P-2 |
| PERF-004/005 (API p95/p99) | P-1, P-3, P-4 |
| SCALE-001 (単一プロセス) | S-1 |
| SCALE-003 (将来分割可能) | S-2 |
| SEC-002 (パスワード保管) | SEC-2, SEC-3, SEC-4, SEC-7 |
| SEC-007 (認可テスト) | SEC-1, SEC-10, SEC-11 |
| SEC-009/010/011 (Rate/CORS/helmet) | SEC-9 |
| SEC-013 (ファイル名 sanitize) | SEC-6 |
| SEC-014 (監査ログ PII) | SEC-8 |
| REL-002 (ドラフト保存信頼性) | R-2 |
| REL-003 (DB トランザクション) | R-3 |
| REL-006 (エラー伝搬) | R-1 |
| MAINT-002/003 (行数制限) | M-5 |
| MAINT-007 (環境変数) | M-6 |
| MAINT-008 (規約) | M-4 |
| TEST-001 (カバレッジ 80%) | M-1, M-2, M-3 |

すべての NFR がいずれかのパターンでカバーされていることを確認 ✓
