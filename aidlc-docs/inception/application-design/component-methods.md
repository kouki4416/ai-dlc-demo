# Component Methods — Ideation Portal

**Date**: 2026-05-03
**Scope**: メソッドシグネチャと高レベル目的のみ。詳細な業務ルール / 例外フロー / バリデーション規則は **Functional Design (CONSTRUCTION フェーズ)** で扱います。
**Source**: `components.md` + `requirements.md` + `stories.md`

---

## DTO 共通定義（参考）

```ts
// 共通レスポンス（CommonModule）
ApiResponse<T> = { success: boolean; data: T | null; error: string | null; meta?: PaginationMeta }
PaginationMeta = { total: number; page: number; limit: number }

// ロール
Role = 'SUBMITTER' | 'PANEL' | 'ADMIN'

// 共通 ID 型
type UserId = string  // UUID
type IdeaId = string  // UUID
type CycleId = string // UUID
type ScoreId = string // UUID
```

---

## C1. AuthModule.AuthService

```ts
login(email: string, password: string): Promise<{ accessToken: string; refreshToken: string; user: UserSummary }>
// Purpose: 認証成功時に JWT ペアを発行
// Errors: InvalidCredentialsException, AccountLockedException

refresh(refreshToken: string): Promise<{ accessToken: string }>
// Purpose: Refresh Token から新しい Access Token を発行
// Errors: InvalidTokenException, TokenExpiredException

logout(userId: UserId, refreshToken: string): Promise<void>
// Purpose: Refresh Token を無効化（DB の revoke リスト追加）

validateUser(userId: UserId): Promise<UserSummary>
// Purpose: JwtAuthGuard 内部で使用（ユーザーが有効かチェック）
```

---

## C2. UsersModule.UsersService

```ts
register(input: RegisterInput): Promise<UserSummary>
// Input: { email, password, displayName }
// Purpose: パスワードをハッシュ化して新規ユーザー作成（デフォルト Role=SUBMITTER）
// Errors: EmailAlreadyExistsException, WeakPasswordException

getMe(userId: UserId): Promise<UserProfile>
// Purpose: 自分のプロフィール取得

requestPasswordReset(email: string): Promise<{ resetToken: string }>
// Purpose: リセットトークン発行（メール送信なし、画面表示のみ）

confirmPasswordReset(resetToken: string, newPassword: string): Promise<void>
// Errors: InvalidTokenException, WeakPasswordException

changeRole(targetUserId: UserId, newRole: Role, requesterId: UserId): Promise<UserSummary>
// Purpose: Admin がパネル任命/解除
// Errors: ForbiddenException (requester not Admin), InvalidRoleTransitionException
```

---

## C3. IdeasModule.IdeasService

```ts
createDraft(authorId: UserId, input: DraftInput): Promise<IdeaDto>
// Input: { title?, summary?, problem?, proposal? } (全て任意、空でも作成可)

updateDraft(ideaId: IdeaId, authorId: UserId, input: DraftInput): Promise<IdeaDto>
// Errors: NotFoundException, ForbiddenException (not author), AlreadyPublishedException

publishIdea(ideaId: IdeaId, authorId: UserId): Promise<IdeaDto>
// Purpose: ドラフトを公開化（必須項目バリデーション後、status='PUBLISHED'）
// Errors: ValidationException (必須未入力), AlreadyPublishedException

listPublishedIdeas(viewerId: UserId, query: { cycleId?: CycleId; page?: number; limit?: number }): Promise<ApiResponse<IdeaListItem[]>>
// Purpose: 公開済みアイデア一覧（匿名表示制御は本メソッド内で実施）

getIdeaDetail(ideaId: IdeaId, viewerId: UserId): Promise<IdeaDetailDto>
// Purpose: 詳細取得（投稿者氏名は匿名解除条件を満たす場合のみ含める）

listMyDrafts(authorId: UserId): Promise<IdeaListItem[]>
listMyPublished(authorId: UserId): Promise<IdeaListItem[]>

attachImage(ideaId: IdeaId, authorId: UserId, file: UploadedFile): Promise<AttachmentDto>
// Errors: FileSizeException, FileTypeException, AttachmentLimitException (>3)

removeAttachment(ideaId: IdeaId, attachmentId: string, authorId: UserId): Promise<void>
```

---

## C4. EvaluationsModule.EvaluationsService

```ts
getQueue(panelistId: UserId, cycleId: CycleId): Promise<EvaluationQueueItem[]>
// Purpose: 評価対象アイデア一覧 + 自分の評価ステータス（NOT_STARTED / DRAFT / FINALIZED）

getMyScore(panelistId: UserId, ideaId: IdeaId): Promise<MyScoreDto>
// Purpose: 自分が当該アイデアに付けたスコアのみ返却（他パネルのスコアは含めない）

saveDraft(panelistId: UserId, ideaId: IdeaId, input: ScoreDraftInput): Promise<MyScoreDto>
// Input: { feasibility?: 1..5, impact?: 1..5, innovation?: 1..5, comment?: string }
// Purpose: 部分入力可能な下書き保存（自動保存に対応）
// Errors: AlreadyFinalizedException, OwnIdeaEvaluationException

finalize(panelistId: UserId, ideaId: IdeaId): Promise<MyScoreDto>
// Purpose: スコア確定。全3軸入力必須
// Errors: IncompleteScoreException, AlreadyFinalizedException

getDetailedScores(ideaId: IdeaId, viewerId: UserId): Promise<DetailedScoresDto>
// Purpose: 全パネルスコア一覧（評価期間終了後 + Admin/投稿者本人のみアクセス可）
// Errors: ForbiddenException, CycleNotClosedException
```

---

## C5. CyclesModule.CyclesService

```ts
createCycle(adminId: UserId, input: { name: string; startsAt: Date; endsAt: Date }): Promise<CycleDto>
// Errors: OverlappingCycleException, ForbiddenException

listCycles(): Promise<CycleDto[]>
getActiveCycle(): Promise<CycleDto | null>

closeCycle(adminId: UserId, cycleId: CycleId, options?: { force?: boolean }): Promise<CycleCloseResult>
// Purpose: サイクル終了処理（一括）
//   1. 全アイデアの集計確定
//   2. 上位3決定（Innovation でタイブレーク）
//   3. 上位3投稿者の匿名解除
// Errors: PendingEvaluationsException (force=false かつ未確定パネルあり)
// Output: CycleCloseResult = { winners: TopThreeDto[]; finalizedIdeasCount: number }

getWinners(cycleId: CycleId): Promise<TopThreeDto[]>
// Purpose: 上位3取得（殿堂表示用）
```

### CyclesModule.AggregationService（内部サービス）
```ts
calculateAverageScore(ideaId: IdeaId): Promise<AggregatedScore>
// Output: { feasibility: number; impact: number; innovation: number; overall: number; finalizedPanelists: number; totalPanelists: number }

determineTopThree(cycleId: CycleId): Promise<IdeaId[]>
// Purpose: 総合スコア降順、同点は Innovation 降順でタイブレーク
```

---

## C6. DashboardModule.DashboardService

```ts
getLeaderboard(query: { cycleId?: CycleId; dimension: 'overall' | 'feasibility' | 'impact' | 'innovation'; page?: number; limit?: number }): Promise<ApiResponse<LeaderboardItem[]>>

getSummary(cycleId?: CycleId): Promise<DashboardSummary>
// Output: { totalIdeas: number; ideasByStatus: { draft: number; published: number; archived: number }; evaluationProgress: { panelistId: UserId; completedCount: number; totalCount: number }[] }

getComparisonView(cycleId?: CycleId): Promise<DimensionComparisonDto>
// Output: { byDimension: { dimension: string; topN: LeaderboardItem[]; distribution: number[] }[] }
```

### DashboardModule.SseService
```ts
streamUpdates(viewerId: UserId): Observable<SseEvent>
// Purpose: SSE エンドポイント実装
// Events: 'idea.published', 'evaluation.finalized', 'cycle.closed'
// Filtering: viewer のロールに応じて配信内容調整
```

---

## C7. RecognitionModule.RecognitionService

```ts
getCurrentHallOfFame(): Promise<HallOfFameDto>
// Output: { cycle: CycleDto; winners: TopThreeDto[] }

getHistory(query?: { page?: number; limit?: number }): Promise<ApiResponse<HallOfFameDto[]>>
```

---

## C8. AdminModule.AdminService

```ts
listPanelMembers(): Promise<UserSummary[]>
listSubmitterCandidates(): Promise<UserSummary[]>
appointPanel(adminId: UserId, targetUserId: UserId): Promise<UserSummary>  // UsersService.changeRole に委譲
revokePanel(adminId: UserId, targetUserId: UserId): Promise<UserSummary>   // 同上

removeIdea(adminId: UserId, ideaId: IdeaId, reason: string): Promise<void>
// Purpose: 不適切投稿削除（status='REMOVED' + 監査ログ記録、評価データは保持）
// Errors: ForbiddenException, NotFoundException

listArchives(query?: { page?: number; limit?: number }): Promise<ApiResponse<IdeaListItem[]>>
// Purpose: アーカイブ済み（1年経過）アイデア一覧

getMetrics(query?: { cycleId?: CycleId }): Promise<AdminMetrics>
// Output: { totalIdeas: number; ideasByPeriod: TimeSeriesPoint[]; evaluationCompletionRate: number; scoreDistribution: ScoreDistribution }

listAuditLog(query?: { actorId?: UserId; from?: Date; to?: Date; page?: number; limit?: number }): Promise<ApiResponse<AuditLogEntry[]>>
```

---

## DTO Summary（簡略）

```ts
UserSummary       = { id, email, displayName, role }
UserProfile       = UserSummary & { createdAt }
IdeaDto           = { id, title, summary, problem, proposal, status, cycleId, attachments[], createdAt, updatedAt }
IdeaListItem      = { id, title, summary, status, score?: AggregatedScore, authorName?: string }  // authorName は匿名解除条件下のみ含む
IdeaDetailDto     = IdeaDto + { aggregatedScore?, comments?[], authorName?: string }
AttachmentDto     = { id, fileName, mimeType, sizeBytes, storedAt }
EvaluationQueueItem = { ideaId, title, status: 'NOT_STARTED' | 'DRAFT' | 'FINALIZED' }
MyScoreDto        = { ideaId, feasibility?, impact?, innovation?, comment?, status: 'DRAFT' | 'FINALIZED' }
AggregatedScore   = { feasibility, impact, innovation, overall, finalizedPanelists, totalPanelists }
DetailedScoresDto = { ideaId, scoresByPanelist: { panelistId, panelistName, scores, comment }[] }
CycleDto          = { id, name, startsAt, endsAt, status: 'ACTIVE' | 'CLOSED' }
TopThreeDto       = { rank: 1|2|3, ideaId, title, summary, authorName, aggregatedScore }
HallOfFameDto     = { cycle: CycleDto, winners: TopThreeDto[] }
LeaderboardItem   = { ideaId, title, score: AggregatedScore, authorName?: string }
DashboardSummary  = { totalIdeas, ideasByStatus, evaluationProgress[] }
AdminMetrics      = { totalIdeas, ideasByPeriod, evaluationCompletionRate, scoreDistribution }
AuditLogEntry     = { id, actorId, action, targetType, targetId, reason?, createdAt }
SseEvent          = { type: string, data: object, timestamp: number }
```

**注**: 各 DTO の詳細フィールド型・必須条件・例外シナリオは Functional Design (per-unit) で詳細化する。
