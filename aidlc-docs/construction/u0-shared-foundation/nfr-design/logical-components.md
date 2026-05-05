# U0 — Logical Components

**Date**: 2026-05-05
**Status**: Approved
**Source**: nfr-design-plan / nfr-design-patterns.md / functional-design/*.md

このドキュメントは U0 が提供する **論理コンポーネント (Module / Service / Pipe / Filter / Interceptor / Decorator / Util)** を整理します。すべて U1〜U6 から DI で利用可能です。

---

## 1. Modules（NestJS Module 構成）

### 1.1 SharedModule（@Global）

**ロケーション**: `backend/src/shared/shared.module.ts`

**役割**: U0 全体を `@Global()` として export、AppModule で 1 度 import すれば全ユニットで利用可能。

**imports / exports**:
```typescript
@Global()
@Module({
  imports: [
    PrismaModule,
    LoggerModule,
    ConfigModule,
    AuditModule,
    SseHubModule,
    HealthModule,
    CommonModule,
  ],
  exports: [
    PrismaModule,
    LoggerModule,
    ConfigModule,
    AuditModule,
    SseHubModule,
    CommonModule,
  ],
})
export class SharedModule {}
```

---

### 1.2 PrismaModule

**役割**: PrismaService を DI で全ユニットに提供。アプリ起動時に DB 接続、終了時に切断。

**Service**: `PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy`

**公開 API**:
- 全 Prisma client メソッド (`prisma.user`, `prisma.idea`, ...)
- `prisma.$transaction(...)` ヘルパー

**他ユニットでの利用**:
```typescript
constructor(private prisma: PrismaService) {}
const idea = await this.prisma.idea.findUnique({ where: { id } })
```

---

### 1.3 LoggerModule（pino）

**役割**: 構造化ログを全ユニットへ提供。pino + nestjs-pino。

**設定**:
- 出力先: stdout のみ
- 形式: JSON
- レベル: env `LOG_LEVEL` (default `info`)
- redact paths: `Pattern SEC-8` 参照

**他ユニットでの利用**:
```typescript
constructor(@InjectPinoLogger(SomeService.name) private logger: PinoLogger) {}
this.logger.info({ userId, ideaId }, 'idea.published')
```

---

### 1.4 ConfigModule

**役割**: 環境変数の読み込み・検証・型付き提供。

**実装**: `@nestjs/config` + class-validator スキーマ

**env スキーマ** (`config/env.validation.ts`):
```typescript
export class EnvSchema {
  @IsString() @MinLength(1) DATABASE_URL: string
  @IsString() @MinLength(32) JWT_SECRET: string
  @IsString() @MinLength(32) JWT_REFRESH_SECRET: string
  @IsString() @Matches(/^\d+(s|m|h|d)$/) JWT_ACCESS_TTL: string = '15m'
  @IsString() @Matches(/^\d+(s|m|h|d)$/) JWT_REFRESH_TTL: string = '7d'
  @IsIn(['development', 'production', 'test']) NODE_ENV: string
  @IsInt() @Min(1) PORT: number
  @IsIn(['debug', 'info', 'warn', 'error']) LOG_LEVEL: string = 'info'
  @IsUrl({ require_tld: false }) CORS_ORIGIN: string
  @IsString() UPLOAD_DIR: string
  @IsInt() @Min(1) MAX_FILE_SIZE_BYTES: number
  @IsInt() @Min(1) @Max(20) MAX_ATTACHMENTS_PER_IDEA: number
}
```

**動作**: 起動時に validate、欠落・不正時 fail-fast (process.exit(1))

---

### 1.5 AuditModule

**役割**: 監査ログの記録・閲覧 API を提供。

**Service**: `AuditService`

**公開 API**:
```typescript
log(action: AuditAction, opts: { userId?: string; targetType?: string; targetId?: string; metadata?: Json }): Promise<void>
findMany(filters: AuditQueryDto): Promise<AuditLog[]>  // ADMIN のみ利用想定
```

**保証**:
- ベストエフォート (記録失敗で本処理を失敗にしない、エラーログのみ)
- PII 含めない (BR-AUDIT-003)

---

### 1.6 SseHubModule

**役割**: Pub/Sub Hub と SSE 配信エンドポイント。

**Service**: `SseHub`

**公開 API**:
```typescript
publish<E extends keyof SseEventMap>(event: E, payload: SseEventMap[E]): void
subscribe(events: SseEventName[], handler: (event: string, payload: any) => void): () => void  // unsubscribe fn
```

**Controller**: `SseController`
- `GET /api/events` — SSE エンドポイント (JWT 認証必須)
- query param: `topics=` (カンマ区切り)
- ロール別配信フィルタ (BR-SSE-002)
- 15 秒 heartbeat

---

### 1.7 HealthModule

**役割**: ヘルスチェック endpoint 群 (`@nestjs/terminus`)

**Controller**: `HealthController`
- `GET /api/health` — liveness (200 OK)
- `GET /api/health/db` — DB 接続確認
- `GET /api/health/ready` — 全依存チェック

---

### 1.8 CommonModule

**役割**: 共通 DTO base / Exception / Validation Pipe / Filter / Interceptor を提供。

**Exports**: 後述の各種 Pipe / Filter / Interceptor / Decorator / DTO base

---

## 2. Pipes（リクエスト処理）

### 2.1 ValidationPipe（グローバル）
**設定**:
```typescript
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,                  // DTO 外フィールド除去
  forbidNonWhitelisted: true,       // 未定義フィールドはエラー
  transform: true,                  // class-transformer を適用
  transformOptions: { enableImplicitConversion: true },
}))
```

### 2.2 ParseCuidPipe
**役割**: URL パラメータの cuid 形式チェック (`/ideas/:id`)
```typescript
@Get(':id')
findOne(@Param('id', ParseCuidPipe) id: string) {...}
```

---

## 3. Filters（例外処理）

### 3.1 GlobalExceptionFilter

**ロケーション**: `shared/common/filters/global-exception.filter.ts`

**役割**: 統一エラーレスポンス形式への変換

**処理ルール**:
| 入力 | 出力 statusCode | code |
|---|---|---|
| `HttpException` | `exception.getStatus()` | `exception.code` (任意) または default |
| `Prisma P2002` (unique violation) | 409 | `UNIQUE_CONSTRAINT` |
| `Prisma P2025` (record not found) | 404 | `NOT_FOUND` |
| `class-validator` ValidationError | 400 | `VALIDATION_ERROR` |
| `JsonWebTokenError` | 401 | `TOKEN_INVALID` |
| `TokenExpiredError` | 401 | `TOKEN_EXPIRED` |
| その他 (unhandled) | 500 | `INTERNAL_ERROR` (詳細はログのみ、レスポンスには含めない) |

**出力形式** (BR-Error 統一):
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "...",
  "code": "VALIDATION_ERROR",
  "timestamp": "2026-05-05T10:00:00Z",
  "path": "/api/ideas/draft"
}
```

---

## 4. Interceptors（横断処理）

### 4.1 LoggerInterceptor

**役割**: 全リクエストに対してログ出力 (req method / path / userId / 応答時間)

**ログフォーマット**:
```json
{ "level": "info", "msg": "request", "method": "POST", "path": "/api/ideas/draft", "userId": "clxyz", "statusCode": 201, "duration_ms": 45 }
```

### 4.2 TimingInterceptor

**役割**: レスポンスヘッダに `X-Response-Time` を追加 (デバッグ用)

---

## 5. Decorators（メタデータ）

### 5.1 @Public()
**役割**: JwtAuthGuard をスキップ (login / register / health 等で使用)
```typescript
export const Public = () => SetMetadata('isPublic', true)

@Public()
@Post('login')
login(...) {...}
```

### 5.2 @Roles(...roles)
**役割**: RolesGuard と連携、必要ロールを宣言
```typescript
export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles)

@Roles(UserRole.ADMIN)
@Post('cycles')
createCycle(...) {...}
```

### 5.3 @CurrentUser()
**役割**: req.user を簡潔に取り出すパラメータデコレーター
```typescript
export const CurrentUser = createParamDecorator((_, ctx) => ctx.switchToHttp().getRequest().user)

@Post('ideas')
create(@CurrentUser() user: AuthUser, @Body() dto: CreateIdeaDto) {...}
```

---

## 6. Guards

### 6.1 JwtAuthGuard
- Bearer token 検証 (passport-jwt strategy)
- `@Public()` メタデータでスキップ
- 検証成功 → req.user = { id, email, role } をセット

### 6.2 RolesGuard
- `@Roles(...)` メタデータを取得
- req.user.role が含まれない → 403 Forbidden

### 6.3 ResourceOwnerGuard (factory)
- 「自分のリソースのみアクセス可」を宣言的に表現
- 実装はリソースタイプ別 (例: `ResourceOwnerGuard('idea', 'submitterId')`)

### 6.4 ThrottlerGuard
- `@nestjs/throttler` の標準 Guard
- 認証エンドポイントのみ適用 (`@UseGuards(ThrottlerGuard)`)
- 設定: 5 req / 60 sec / IP

---

## 7. DTO Base

### 7.1 PaginationDto
```typescript
export class PaginationDto {
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) page?: number = 1
  @IsOptional() @IsInt() @Min(1) @Max(100) @Type(() => Number) limit?: number = 20
}
```

### 7.2 PaginatedResponseDto<T>
```typescript
export class PaginatedResponseDto<T> {
  items: T[]
  total: number
  page: number
  limit: number
}
```

### 7.3 ErrorResponseDto
（GlobalExceptionFilter の出力スキーマ、Swagger 用）

---

## 8. Utilities

### 8.1 token-hash.ts
```typescript
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}
```

### 8.2 sanitize-filename.ts
```typescript
export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100)
}
```

### 8.3 file-storage.ts
```typescript
export async function saveAttachment(ideaId: string, originalName: string, buffer: Buffer): Promise<{ storedPath: string }>
export async function deleteAttachment(storedPath: string): Promise<void>
```

ファイル保存先のパストラバーサル対策込み。

### 8.4 round-to-decimals.ts
```typescript
export function roundTo(value: number, decimals: number = 2): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}
```

集計ロジック (BR-AGG-001) で利用。

---

## 9. Frontend 共通コンポーネント

functional-design/frontend-components.md と整合。コンポーネント名と役割の再掲:

| コンポーネント | 役割 |
|---|---|
| `RootLayout` | アプリ全体の HTML / Body / Provider |
| `AuthContext` | 認証状態の Context |
| `Navigation` | 共通 Navigation バー (各ユニットがメニュー登録) |
| `Sidebar` | 認証済みユーザー用サイドバー (ロール別) |
| `Header` | ヘッダー (ユーザー名 / ロール / ログアウト) |
| `AuthGuard` | 認証必須ページのラッパー |
| `RoleGuard` | ロール必須ページのラッパー |
| `ErrorBoundary` | React Error Boundary |
| `LoadingSpinner` | 共通 Loading 表示 |
| `EmptyState` | 共通 Empty 状態表示 |

| Hook | 役割 |
|---|---|
| `useAuth` | 認証状態 / login / logout |
| `useSSE` | SSE 購読 |
| `useApi` | TanStack Query 薄い wrapper |
| `useToast` | sonner 薄い wrapper |
| `useDraftAutoSave` | ドラフト自動保存 (R-2 パターン実装) |

| Lib | 役割 |
|---|---|
| `api-client` | axios + JWT interceptor + 401 自動 refresh |
| `sse-client` | EventSource wrapper |
| `auth-storage` | localStorage wrapper |
| `nav-config` | ナビゲーション項目登録 API |
| `query-client` | TanStack Query 設定 |

---

## 10. 利用例まとめ（後続ユニット向け）

### Backend
```typescript
// ユニット側 (例: U2 IdeasService)
@Injectable()
export class IdeasService {
  constructor(
    private prisma: PrismaService,                                  // U0
    @InjectPinoLogger(IdeasService.name) private logger: PinoLogger, // U0
    private audit: AuditService,                                     // U0
    private sseHub: SseHub,                                          // U0
    @Inject(forwardRef(() => CycleService)) private cycle: CycleService, // U6
  ) {}

  async publish(ideaId: string, userId: string) {
    const cycle = await this.cycle.assertActiveCycle()
    const idea = await this.prisma.idea.update({ where: { id: ideaId }, data: { status: 'PUBLISHED', publishedAt: new Date() } })
    await this.audit.log('IDEA_PUBLISH', { userId, targetType: 'Idea', targetId: ideaId })
    this.sseHub.publish('idea.published', { ideaId, cycleId: cycle.id, publishedAt: idea.publishedAt!.toISOString(), title: idea.title })
    this.logger.info({ ideaId, cycleId: cycle.id }, 'idea.published')
    return idea
  }
}

// Controller
@Controller('ideas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IdeasController {
  constructor(private ideasService: IdeasService) {}

  @Post(':id/publish')
  @Roles(UserRole.SUBMITTER, UserRole.PANEL, UserRole.ADMIN)
  publish(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.ideasService.publish(id, user.id)
  }
}
```

### Frontend
```tsx
// app/ideas/[id]/page.tsx
'use client'
import { AuthGuard } from '@/components/shared/AuthGuard'
import { useApi } from '@/hooks/useApi'
import { useSSE } from '@/hooks/useSSE'
import { api } from '@/lib/api-client'

export default function IdeaDetail({ params }: { params: { id: string } }) {
  const { data: idea } = useApi(['idea', params.id], () => api.get(`/ideas/${params.id}`))
  useSSE(['idea.deleted'], (event, payload) => {
    if (event === 'idea.deleted' && payload.ideaId === params.id) toast.error('このアイデアは削除されました')
  })
  return <AuthGuard>{idea && <IdeaView idea={idea} />}</AuthGuard>
}
```
