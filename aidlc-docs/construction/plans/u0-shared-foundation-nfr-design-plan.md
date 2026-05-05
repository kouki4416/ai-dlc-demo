# U0 Shared Foundation — NFR Design Plan

**Date**: 2026-05-05
**Status**: ✅ Approved — All AI recommendations adopted (2026-05-05)
**Unit**: U0 Shared Foundation
**Source**: `nfr-requirements.md` (PERF/SCALE/SEC/REL/MAINT/TEST/UX/OBS/STORE) + `tech-stack-decisions.md` + `functional-design/*.md`

---

## 0. NFR Design スコープ

このステージでは、NFR Requirements で確定した「**何を満たすか**」を、「**どう設計で実現するか**」(=パターン + 論理コンポーネント) に翻訳します。

| 入力 | 出力 |
|---|---|
| 「100 同時接続を捌く」(NFR) | → 単一 Node プロセス + EventEmitter + Connection Pool 実装パターン (Design) |
| 「カバレッジ 80%」(NFR) | → テストピラミッド設計 + モック戦略 (Design) |
| 「Cycle 終了は atomic」(NFR) | → トランザクション境界 + Saga 不要判定 (Design) |
| 「認証セキュア」(NFR) | → JWT + Refresh Rotation + Guard Chain パターン (Design) |

---

## 1. 設計パターン選定の質問

各質問の `[Answer]:` に直接回答してください。AI 推奨が既記入されています。

---

### Q1. エラーハンドリング・リカバリ戦略（Resilience Patterns）

**問**: API エラー時のリトライ・フォールバック戦略は？

- **A. Fail-Fast (推奨)**: エラー時は即座に失敗を返却、リトライ判断は呼出元 (FE TanStack Query)。BE 側でリトライしない。
- **B. BE 側で自動リトライ**: 一時的エラー (DB connection 瞬断等) は BE 内部で 2-3 回リトライ。
- **C. Circuit Breaker**: opossum 等で外部依存の障害を遮断、フォールバック値を返す。

**AI 推奨**: **A**。理由:
- PoC、外部依存ゼロ (DB 同一コンテナ)
- TanStack Query が標準で 3 回リトライ + exponential backoff を実装
- BE で複雑なリトライロジックを入れると debug が難しくなる
- ドラフト保存の信頼性 (NFR-5.2) は FE 側のリトライ + Toast 通知で対応

[Answer]: A

---

### Q2. ドラフト自動保存のリトライ設計（Resilience Patterns）

**問**: ドラフト自動保存 (BR-IDEA-004) の失敗時挙動 (NFR-5.2 信頼性必須):

- **A. FE 側でキューイング + 指数バックオフリトライ (推奨)**: 保存失敗時はメモリキューに退避、次の編集時 or 30 秒後に再試行。
- **B. localStorage に未送信データを persist + リロード時復元**: A に加え、ブラウザクラッシュにも耐性あり。
- **C. シンプル fail + Toast 通知のみ**: ユーザに手動再保存依頼。

**AI 推奨**: **B**。理由: NFR-5.2 が「信頼性高く動作」を求めているため、A に加えて localStorage バックアップでブラウザクラッシュ・タブ閉じにも対応。実装コストは小（localStorage の薄い wrapper）。

[Answer]: B

---

### Q3. SSE 接続管理（Resilience Patterns / Performance Patterns）

**問**: SSE 接続の障害時挙動と Heartbeat 詳細:

- **A. 標準実装 (推奨)**: 15 秒 heartbeat + 5 分 timeout で切断 + EventSource ネイティブ自動再接続 (3 秒間隔)。
- **B. 自前再接続ロジック**: EventSource のネイティブを切り、自前で expose backoff 制御。
- **C. heartbeat なし**: シンプルだがクライアントが切断検知できない。

**AI 推奨**: **A**。理由: business-logic-model.md / business-rules.md で確定済、ブラウザネイティブの再接続で十分。

[Answer]: A

---

### Q4. パフォーマンス最適化のレイヤー（Performance Patterns）

**問**: クエリ最適化の戦略は？

| レイヤー | AI 推奨方針 |
|---|---|
| **DB レイヤー** | Prisma の `@@index` (domain-entities.md で定義済) で必要箇所だけ index。N+1 対策は `include` / `select` で明示制御。 |
| **キャッシュレイヤー** | **実装しない** (PoC、規模 100 ユーザー、TTL 管理コスト > リターン)。FE は TanStack Query の staleTime で短期キャッシュ。 |
| **リーダーボード集計** | オンザフライ集計 (毎リクエスト Prisma `groupBy`)。Materialized View や事前計算は YAGNI。 |
| **ファイル配信** | NestJS の `Express.static('uploads')` で静的配信、CDN 不要。認証は JwtAuthGuard で保護。 |

- **A.** AI 推奨で確定
- **B.** 修正したい

[Answer]: A

---

### Q5. リーダーボード再計算のトリガー（Performance Patterns）

**問**: ダッシュボードのリーダーボードはどう更新する？

- **A. オンザフライ + SSE invalidate (推奨)**: 各 GET でその時点の集計を計算。FE は `score.confirmed` SSE で TanStack Query を invalidate して refetch。
- **B. Materialized View + 30秒間隔再計算**: バッチで集計テーブル更新、FE はそれを fetch。
- **C. SSE で集計済結果を push**: BE が変更検知して集計を push、FE は受け取るだけ。

**AI 推奨**: **A**。理由:
- 100 ユーザー規模、Idea 数も精々 100 件、Score 数 1 万以下 → MySQL groupBy で 100ms 以内
- materialized view の整合性管理コストが PoC で見合わない
- SSE が薄いシグナルとして機能 (event 内容に集計結果含めず、refetch のみ trigger)
- NFR-1.3 の「30 秒以内反映」を SSE 経由で容易に達成

[Answer]: A

---

### Q6. 認証 Guard チェーン設計（Security Patterns）

**問**: NestJS の Guard チェーン適用方針:

**AI 推奨設計**:
```
Request
  ↓
[GlobalThrottlerGuard]   ← @nestjs/throttler (Q3=B 認証エンドポイントのみ)
  ↓
[JwtAuthGuard]           ← Bearer token 検証 (デフォルト全エンドポイント)
  ↓
[RolesGuard]             ← @Roles() メタデータと照合
  ↓
[ResourceOwnerGuard]     ← (必要な箇所のみ) 自分の Idea/Score への制限
  ↓
Handler
```

**Decorator 戦略**:
- `@Public()` で JwtAuthGuard をスキップ (login / register / health 等)
- `@Roles(UserRole.ADMIN)` で必要ロール宣言
- `@CurrentUser()` で req.user を取り出すパラメータデコレーター

- **A.** AI 推奨で確定
- **B.** 修正したい

[Answer]: A

---

### Q7. パスワード保存・検証の堅牢化（Security Patterns）

**問**: bcrypt 周辺の追加防御:

**AI 推奨**:
- bcrypt cost=10 (BR-AUTH-002 既定)
- パスワードチェックは **constant-time compare** (bcrypt が内部で実装、自前で `===` 比較しない)
- ログイン失敗時のエラーメッセージは「メールまたはパスワードが正しくない」(ユーザー存在/非存在を区別しない、BR-AUTH-002 既定)
- パスワード平文を含むフィールドは `class-transformer` の `@Exclude()` でレスポンス除外
- ログ出力時は password / passwordHash / token をマスク (`pino-redact` 設定)

- **A.** AI 推奨で確定
- **B.** 修正したい

[Answer]: A

---

### Q8. 認可テスト戦略（Security Patterns）

**問**: NFR-2.5 のパネル独立性テストの設計:

**AI 推奨**:
- E2E テストで以下シナリオを確認 (Build and Test ステージ):
  1. PNL_A が `GET /api/scores/{ideaId}` で他パネル(PNL_B)のスコア取得試行 → 403/フィルタリング
  2. PNL_A が `GET /api/scores?cycleId=X` で全 Score 取得試行 → 自分のものだけ返却
  3. SUBMITTER が `POST /api/scores` で評価試行 → 403
  4. ADMIN が Cycle OPEN 中に詳細 Score 取得試行 → 集計値のみ
  5. ADMIN が Cycle CLOSED 後に詳細 Score 取得 → 全件可
  6. SUBMITTER が CLOSED 後に自分の Idea スコア取得 → 全件可
- 単体テストレベルでは Service のロジックを網羅
- このテスト群は U3/U6 で実装、U0 では Test Helper (認可テスト共通ユーティリティ) を提供

- **A.** AI 推奨で確定
- **B.** 修正したい

[Answer]: A

---

### Q9. トランザクション境界の設計（Resilience Patterns）

**問**: Prisma `$transaction` の使用方針:

**AI 推奨適用箇所**:

| 操作 | トランザクション要否 | 理由 |
|---|---|---|
| User 登録 | 不要 | 単一テーブル INSERT |
| Idea 公開 | 不要 (status 更新 + SSE publish) | SSE は after commit、DB 内部は単一 row update |
| Score 確定 | 不要 | 単一 row update |
| **Cycle 終了** | **必須** | 集計 + ranking + status 更新 + AuditLog の atomicity (BR-CYCLE-003) |
| **不適切投稿削除** | 必須 | Idea status + AuditLog atomicity |
| **ロール変更** | 必須 | User update + AuditLog atomicity |
| **パスワードリセット** | 必須 | passwordHash 更新 + 全 RT 失効 + ResetToken usedAt + AuditLog |
| Refresh Token Rotation | 必須 | 旧 RT revoke + 新 RT create の atomicity |

- **A.** AI 推奨で確定
- **B.** 修正したい

[Answer]: A

---

### Q10. ログマスキング戦略（Security / Observability）

**問**: pino のログから機密情報を除外する設計:

**AI 推奨**: **`pino-redact` で path-based マスク**

```typescript
// shared/logger/logger.module.ts
{
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.password',
      'req.body.newPassword',
      'req.body.passwordHash',
      'req.body.refreshToken',
      'req.body.token',
      '*.passwordHash',
      '*.refreshToken',
      '*.tokenHash',
    ],
    censor: '[REDACTED]'
  }
}
```

- **A.** AI 推奨で確定
- **B.** 修正したい

[Answer]: A

---

### Q11. テストピラミッド設計（Maintainability / Testability）

**問**: テストの量的バランス:

**AI 推奨ピラミッド**:

```
              ┌────┐
              │ E2E│    5%   (Playwright: 各 Epic の golden path 6本程度)
            ┌─┴────┴─┐
            │  Integ │  20%   (supertest: 各 Module の主要 API、認可テスト)
          ┌─┴────────┴─┐
          │    Unit    │ 75%   (Service / Repository / 集計ロジック / Validator)
          └────────────┘
```

| 層 | カバレッジ目標 | 実装方針 |
|---|---|---|
| Unit | 80%+ | 各 Service / Repository / 集計ロジックを単体テスト、Prisma はモック |
| Integration | 主要 API 全カバー | TestingModule + 実 DB (Docker test container) または mock-mysql |
| E2E | 6 本 (1 Epic 1 本) | 認証フロー / 投稿〜公開 / 評価〜確定 / Cycle 終了 / 殿堂 / Admin |

- **A.** AI 推奨で確定
- **B.** 修正したい

[Answer]: A

---

### Q12. Integration テストでの DB 戦略（Testability）

**問**: 統合テスト実行時の DB は？

- **A. Testcontainers (mysql) で各テストファイル前に起動 + 各テスト前にクリーンアップ**: 隔離性高、CI でも動く、初回起動 30 秒。
- **B. docker-compose で別インスタンス、開発者が手動起動**: 高速、隔離性は手動依存。
- **C. プロダクト用 DB を共有 + transaction rollback**: 最速だが他テストと干渉リスク。

**AI 推奨**: **A**。理由: 隔離性の信頼性が最優先、PoC でもテスト品質に妥協しない、CI/CD で再現可能。テスト実行時のみ立ち上がる軽量さも GOOD。

[Answer]: A

---

### Q13. Module / Layer の論理コンポーネント設計（Logical Components）

**問**: NestJS の Module 設計と DI 構造:

**AI 推奨**:

**Layer 構造（各 Module 内）**:
```
Controller (HTTP/Routing)
  ↓ DTO で入力検証
Service (Business Logic)
  ↓
Repository (Data Access — Prisma に閉じる)
  ↓
PrismaService (U0 提供)
```

**禁止事項**:
- Controller から Repository を直接呼び出さない (Service 経由必須)
- Service から他 Module の Repository を呼び出さない (他 Module の Service 経由)
- ビジネスロジックを Controller に書かない (Controller は thin、Service は thick)

**共通 Pipe / Filter / Interceptor**:
- `ValidationPipe` (グローバル) — class-validator 適用
- `GlobalExceptionFilter` (グローバル) — 統一エラー形式変換
- `LoggerInterceptor` (グローバル) — リクエスト/レスポンスのログ出力 (pino)
- `TransformInterceptor` (グローバル) — レスポンス整形 (snake_case → camelCase 等は不要、Prisma そのまま)

- **A.** AI 推奨で確定
- **B.** 修正したい

[Answer]: A

---

### Q14. FE のレンダリング戦略（Performance Patterns）

**問**: Next.js App Router のレンダリングモード選択:

**AI 推奨**:
- **Auth ページ (login / register / forgot-password)**: SSR (default、認証不要なので高速)
- **Dashboard / Idea 詳細**: CSR (TanStack Query で fetch、Auth 必須)
- **Hall of Fame (殿堂)**: CSR (Auth 必須、SSE 連動)
- **Admin**: CSR (Auth 必須、ロールガード)
- **Static**: 該当なし (全ページが動的)

理由: 全ユーザーがログイン必須、PoC でローカル単一サーバ、SSR キャッシュ戦略不要。

- **A.** AI 推奨で確定
- **B.** 修正したい

[Answer]: A

---

## 2. 生成成果物（回答受領後に作成）

- [ ] `aidlc-docs/construction/u0-shared-foundation/nfr-design/nfr-design-patterns.md`
  - 採用パターン一覧 (Resilience / Scalability / Performance / Security)
  - 各パターンの実装方針 + コードスケッチ + どの NFR を満たすか
- [ ] `aidlc-docs/construction/u0-shared-foundation/nfr-design/logical-components.md`
  - U0 が提供する論理コンポーネント (Module / Service / Pipe / Filter / Interceptor / Decorator) の一覧
  - 各コンポーネントの責務 + 公開 API + 利用例

## 3. 完了基準

- [x] nfr-design-plan.md 生成（本ファイル）
- [ ] Q1〜Q14 全部回答
- [ ] 曖昧性チェック完了
- [ ] 2 成果物生成
- [ ] ユーザーが NFR Design を承認

---

## 📋 ユーザーアクション

**Q1〜Q14 を確認してください。** AI 推奨が `[Answer]:` に既記入済みです。

- そのままで良ければ **"approve"** または "OK" → 2 成果物生成へ
- 修正したい質問があれば、該当 Q 番号と値を返してください
