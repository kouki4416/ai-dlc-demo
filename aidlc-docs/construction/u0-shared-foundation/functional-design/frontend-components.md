# U0 — Frontend Components (Shared Foundation)

**Date**: 2026-05-05
**Status**: Generated
**Source**: functional-design-plan Q13

このドキュメントは U0 が提供する Frontend 共通基盤を定義します。U1〜U6 はこの基盤の上にユニット別 UI を実装します。

---

## 1. ライブラリ選定（確定）

| カテゴリ | ライブラリ | 用途 |
|---|---|---|
| Framework | Next.js 14+ App Router | SSR/CSR/Routing |
| Language | TypeScript (strict) | 型安全 |
| Styling | Tailwind CSS 3.x | Utility-first CSS |
| UI Components | shadcn/ui | Tailwind ベースの構築済コンポーネント |
| Form | React Hook Form + zod | フォーム管理 + FE バリデーション |
| Data Fetching | TanStack Query (React Query) v5 | キャッシュ + SSE 連携 |
| HTTP Client | axios | API client（interceptor で JWT 注入） |
| State Mgmt | React Context | 認証状態のみ（規模小） |
| Icons | lucide-react | SVG アイコン |
| Charts | recharts | レーダーチャート / 棒グラフ（U4 で利用） |
| Notifications | sonner | Toast 通知 |
| Date | date-fns | 日付フォーマット |

---

## 2. ディレクトリ構造（U0 部分）

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # U0: RootLayout
│   │   ├── page.tsx                    # ホームページ (ロール別リダイレクト)
│   │   ├── error.tsx                   # U0: グローバルエラー UI
│   │   ├── not-found.tsx               # U0: 404 ページ
│   │   └── globals.css                 # U0: Tailwind base
│   │
│   ├── components/
│   │   ├── shared/                     # U0 オーナー
│   │   │   ├── Navigation.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── AuthGuard.tsx
│   │   │   ├── RoleGuard.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   └── EmptyState.tsx
│   │   └── ui/                         # shadcn/ui CLI 生成 (button, dialog, etc.)
│   │
│   ├── contexts/
│   │   └── AuthContext.tsx             # U0: 認証 Context Provider
│   │
│   ├── hooks/
│   │   ├── useAuth.ts                  # U0
│   │   ├── useSSE.ts                   # U0
│   │   ├── useApi.ts                   # U0 (TanStack Query wrapper)
│   │   └── useToast.ts                 # U0 (sonner wrapper)
│   │
│   ├── lib/
│   │   ├── api-client.ts               # U0: axios instance + interceptors
│   │   ├── sse-client.ts               # U0: EventSource wrapper
│   │   ├── auth-storage.ts             # U0: localStorage wrapper for tokens
│   │   ├── nav-config.ts               # U0: ナビゲーション項目登録基盤
│   │   ├── query-client.ts             # U0: TanStack Query 設定
│   │   └── utils.ts                    # U0: 汎用ユーティリティ (cn 等)
│   │
│   ├── types/
│   │   ├── user.ts                     # U0: 共通型 (User, UserRole)
│   │   ├── api.ts                      # U0: API レスポンス型
│   │   └── sse.ts                      # U0: SSE イベント型
│   │
│   └── middleware.ts                   # U0: Next.js middleware (認証リダイレクト)
```

---

## 3. コンポーネント詳細

### 3.1 RootLayout (`app/layout.tsx`)

**役割**: アプリ全体のルートレイアウト

**Props**: `{ children: ReactNode }`

**State**: なし（Provider のみ）

**実装スケッチ**:
```tsx
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <Toaster richColors />
            {children}
          </AuthProvider>
        </QueryClientProvider>
      </body>
    </html>
  )
}
```

**API 連携**: なし

---

### 3.2 AuthContext (`contexts/AuthContext.tsx`)

**役割**: 認証状態を React Tree 全体に提供

**State**:
```typescript
interface AuthContextValue {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}
```

**動作**:
1. 起動時 `localStorage` から token 読み込み → `/api/auth/me` で User 取得
2. login 成功 → token を localStorage に保存
3. logout → API 呼び出し + localStorage クリア
4. refresh → 401 検知時に api-client から自動呼び出し

---

### 3.3 Navigation (`components/shared/Navigation.tsx`)

**役割**: トップ Navigation バー（ヘッダー）

**Props**: なし

**実装方針**: `nav-config.ts` から **ロール別メニュー項目** を取得して描画。各ユニットは `nav-config.ts` の `register()` でメニュー項目を提供。

**nav-config.ts 例**:
```typescript
export interface NavItem {
  label: string
  href: string
  icon?: ReactNode
  roles: UserRole[]                    // このメニューを表示するロール
  unit: 'U0' | 'U1' | 'U2' | ... | 'U6'
}

const items: NavItem[] = []

export function registerNavItem(item: NavItem) { items.push(item) }
export function getVisibleNavItems(role: UserRole): NavItem[] {
  return items.filter(i => i.roles.includes(role))
}
```

**ユニット別登録例（後続ユニットが実装）**:
```typescript
// U2 (Submission) 内
registerNavItem({ label: "アイデア投稿", href: "/ideas/new", roles: [SUBMITTER, PANEL, ADMIN], unit: "U2" })

// U3 (Eval) 内
registerNavItem({ label: "評価", href: "/evaluate", roles: [PANEL], unit: "U3" })
```

---

### 3.4 Sidebar (`components/shared/Sidebar.tsx`)

**役割**: 認証済みユーザー向けサイドバー（管理画面・ダッシュボード入口）

**Props**: なし（AuthContext から user/role 取得）

**実装方針**: ロール別にセクション分け表示
- SUBMITTER: 「自分の投稿」「ダッシュボード」「殿堂」
- PANEL: 上記 + 「評価」
- ADMIN: 上記 + 「管理」

---

### 3.5 Header (`components/shared/Header.tsx`)

**役割**: 上部ヘッダー（ロゴ・ユーザーアイコン・ログアウト）

**Props**: なし

**State**: AuthContext

**機能**:
- ユーザー名表示
- ロール表示（バッジ）
- ログアウトボタン → `useAuth().logout()`
- 通知アイコン（SSE イベント数バッジ、将来拡張）

---

### 3.6 AuthGuard (`components/shared/AuthGuard.tsx`)

**役割**: 認証必須ページのラッパー（未認証時にリダイレクト）

**Props**: `{ children: ReactNode, redirectTo?: string }` (default: `/auth/login`)

**実装**:
```tsx
export function AuthGuard({ children, redirectTo = '/auth/login' }) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace(redirectTo)
  }, [isLoading, isAuthenticated])

  if (isLoading) return <LoadingSpinner />
  if (!isAuthenticated) return null
  return <>{children}</>
}
```

---

### 3.7 RoleGuard (`components/shared/RoleGuard.tsx`)

**役割**: ロール必須ページのラッパー

**Props**: `{ allow: UserRole[], children: ReactNode, fallback?: ReactNode }`

**実装**:
```tsx
export function RoleGuard({ allow, children, fallback }) {
  const { user } = useAuth()
  if (!user || !allow.includes(user.role)) return fallback ?? <ForbiddenPage />
  return <>{children}</>
}
```

---

### 3.8 ErrorBoundary (`components/shared/ErrorBoundary.tsx`)

**役割**: React Error Boundary（コンポーネントツリー内のエラーキャッチ）

**Props**: `{ children: ReactNode, fallback?: ReactNode }`

---

### 3.9 LoadingSpinner / EmptyState

**役割**: 共通 Loading / Empty 状態の表示パーツ。各ユニットがリスト系画面で利用。

---

## 4. Hooks 詳細

### 4.1 useAuth

```typescript
const { user, isAuthenticated, isLoading, login, logout } = useAuth()
```

AuthContext の wrapper。Context 取得を簡略化。

### 4.2 useSSE

```typescript
function useSSE<T>(events: string[], handler: (event: string, payload: T) => void)
```

**動作**:
1. `EventSource('/api/events?topics=' + events.join(','))` で接続
2. 各イベント `addEventListener(event, ...)` 登録
3. unmount 時に `eventSource.close()`
4. 接続失敗時は EventSource ネイティブの自動再接続

**使用例 (U4)**:
```tsx
useSSE(['idea.published', 'score.confirmed'], (event, payload) => {
  if (event === 'idea.published') queryClient.invalidateQueries(['leaderboard'])
})
```

### 4.3 useApi

TanStack Query の薄い wrapper（型推論強化）。

```typescript
function useApi<T>(key: QueryKey, fn: () => Promise<T>, options?: UseQueryOptions<T>)
```

### 4.4 useToast

sonner の薄い wrapper（成功/エラー通知の統一）。

```typescript
const { success, error, info } = useToast()
success("保存しました")
error("通信エラー")
```

---

## 5. lib 詳細

### 5.1 api-client.ts (axios instance + interceptors)

```typescript
// インスタンス
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,  // http://localhost:3001/api
  timeout: 10000,
})

// Request interceptor: JWT 注入
api.interceptors.request.use(config => {
  const token = getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Response interceptor: 401 → refresh → retry
api.interceptors.response.use(
  res => res,
  async err => {
    if (err.response?.status === 401 && !err.config._retry) {
      err.config._retry = true
      await refreshAccessToken()
      return api(err.config)  // retry
    }
    return Promise.reject(err)
  }
)
```

### 5.2 sse-client.ts

```typescript
export function createSSE(topics: string[], handlers: Record<string, (data: any) => void>) {
  const url = new URL('/api/events', process.env.NEXT_PUBLIC_API_BASE_URL)
  url.searchParams.set('topics', topics.join(','))
  url.searchParams.set('token', getAccessToken() ?? '')
  const es = new EventSource(url.toString())
  Object.entries(handlers).forEach(([event, fn]) => {
    es.addEventListener(event, e => fn(JSON.parse(e.data)))
  })
  return () => es.close()
}
```

### 5.3 auth-storage.ts

localStorage への accessToken / refreshToken / user 情報の永続化。

---

## 6. middleware.ts (Next.js)

サーバサイドでの認証チェック（FE で localStorage 使う関係上、初期描画時はクライアントで判定 → middleware は最低限）:
- `/auth/*`: 既ログイン時 `/dashboard` へリダイレクト
- 静的ファイル / `/api/*`: 通過
- それ以外: クライアント側 AuthGuard で制御

---

## 7. 共通型定義 (types/)

### types/user.ts
```typescript
export type UserRole = 'SUBMITTER' | 'PANEL' | 'ADMIN'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  isActive: boolean
  createdAt: string
}
```

### types/api.ts
```typescript
export interface ErrorResponse {
  statusCode: number
  error: string
  message: string | string[]
  code: string
  timestamp: string
  path: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
}
```

### types/sse.ts
```typescript
export type SseEventName =
  | 'idea.published'
  | 'score.confirmed'
  | 'cycle.closed'
  | 'idea.deleted'

export interface SseEventMap {
  'idea.published': { ideaId: string; cycleId: string; publishedAt: string; title: string }
  'score.confirmed': { ideaId: string; cycleId: string }
  'cycle.closed': { cycleId: string; closedAt: string; top3: Array<{ rank: number; ideaId: string; title: string; submitterName: string }> }
  'idea.deleted': { ideaId: string; cycleId: string; reason?: string }
}
```

---

## 8. ユニット別 FE への期待事項

各ユニット（U1〜U6）が U0 基盤を利用する際のルール:

1. ナビゲーション項目は `nav-config.ts` の `registerNavItem()` で登録（直接 Navigation.tsx を編集しない）
2. 認証必須ページは `<AuthGuard>` でラップ
3. ロール必須ページは `<RoleGuard allow={[...]}>` でラップ
4. API 呼び出しは `lib/api-client.ts` の `api` インスタンスを使う（直接 axios インポートしない）
5. SSE は `useSSE` フック経由で購読（直接 EventSource インポートしない）
6. フォームは React Hook Form + zod、エラー表示は shadcn/ui の Form/FormMessage を使う
7. Toast 通知は `useToast` フック経由（直接 sonner インポートしない）

---

## 9. 完了基準（U0 FE 部分）

- [ ] `npm install` で全依存解決
- [ ] `app/layout.tsx` 起動でエラーなく描画
- [ ] AuthContext が空 token 状態で正常動作
- [ ] Navigation / Sidebar / Header が空項目で描画 (各ユニット未実装でも壊れない)
- [ ] AuthGuard / RoleGuard が単体で機能
- [ ] api-client が dev サーバ起動中の backend に到達可能（404 でも OK、ネットワーク確認）
- [ ] sse-client が EventSource 接続を確立可能
- [ ] shadcn/ui の Button / Input / Dialog / Form / Toast 等が動作
- [ ] Tailwind が globals.css 経由で適用される
