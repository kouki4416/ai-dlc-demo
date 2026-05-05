# U0 Shared Foundation — NFR Requirements Plan

**Date**: 2026-05-05
**Status**: ✅ Approved — All AI recommendations adopted (2026-05-05)
**Unit**: U0 Shared Foundation
**Source**: `requirements.md` (NFR-1〜NFR-7) / `unit-of-work.md` U0 / `functional-design/*.md`

---

## 0. 確定済み NFR（要件定義から継承、再質問不要）

| ID | NFR | 値 |
|---|---|---|
| NFR-1.1 | 想定同時接続数 | 100 ユーザー |
| NFR-1.2 | ページ初期ロード | < 2 秒 (ローカル基準) |
| NFR-1.3 | ダッシュボード SSE 反映 | < 30 秒 |
| NFR-2.1 | 機密度 | 標準 (GDPR / 個人情報保護法レベル) |
| NFR-2.2 | パスワード | bcrypt ハッシュ化 |
| NFR-2.3 | HTTPS | 本番のみ必須、ローカル HTTP 可 |
| NFR-2.4 | XSS / CSRF / SQLi | フレームワーク標準で対応 |
| NFR-2.5 | パネル独立性 | 認可テスト必須 |
| NFR-2.6 | Security 拡張 | 適用しない (J1=No) |
| NFR-3.1 | 言語 | 日本語のみ |
| NFR-3.2 | 多言語 | 実装しない |
| NFR-4.1 | WCAG 2.2 | 必須としない |
| NFR-4.2 | 最小 a11y | キーボード操作 / alt 属性 |
| NFR-5.1 | SLA | ローカルのため規定なし |
| NFR-5.2 | ドラフト保存 | 信頼性必須 |
| NFR-6.1 | TS strict | ON |
| NFR-6.2 | ファイル長 / 関数長 | ≤ 800 / ≤ 50 行 |
| NFR-6.3 | Unit Test | 主要ロジック必須 |
| NFR-7.1 | カバレッジ | ≥ 80% |
| NFR-7.2 | PBT 拡張 | 適用しない (J2=No) |
| NFR-7.3 | TDD | 推奨 |

これらは **再質問しません**。U0 が遵守・実装します。

---

## 1. 追加で決定が必要な NFR 領域（質問）

各質問の `[Answer]:` に直接回答してください。AI 推奨が既記入されています。

---

### Q1. SSE 配信のスケーラビリティ戦略（Performance）

**問**: SSE Pub/Sub の実装は？

- **A. インメモリ EventEmitter (推奨)**: 単一 Node プロセス内で完結。100 同時接続なら十分。
- **B. Redis Pub/Sub**: 複数プロセス対応、運用負荷増。
- **C. RxJS Subject**: NestJS 標準的、A と同等の単一プロセス制約。

**AI 推奨**: **A**。理由: 規模 100 ユーザー、ローカル開発のみ、Docker Compose 単一 backend コンテナ運用で水平スケール不要。

[Answer]: A

---

### Q2. DB Connection Pool サイズ（Performance）

**問**: Prisma の MySQL connection pool size は？

- **A. デフォルト (Prisma: `num_physical_cpus * 2 + 1`)** — 通常 9〜17
- **B. 明示的に 20 に設定**: 100 同時接続 + 各リクエストで複数 query を考慮
- **C. 明示的に 50 以上**: 余裕を持って大きめ

**AI 推奨**: **B (20)**。理由: NestJS request 単位で 1〜2 connection 利用、100 並行 = ピーク 200 query を 20 接続で 10x 多重化、DB 側の MySQL 8.x default `max_connections=151` でも余裕。`DATABASE_URL` クエリパラメータで `?connection_limit=20` 指定。

[Answer]: A

---

### Q3. Rate Limiting（Security）

**問**: API へのレート制限は実装しますか？

- **A. 実装しない (PoC)**: 社内 100 ユーザー、悪意ある攻撃想定外
- **B. 認証エンドポイントのみ**: `/auth/login`, `/auth/forgot-password` を 5 req/min/IP に制限 (brute force 緩和)
- **C. 全エンドポイント**: nestjs-throttler で全体 60 req/min/IP

**AI 推奨**: **B**。理由: 認証系は最小限の brute force 対策が望ましい、その他は PoC として制限なし、実装コストも軽微 (`@nestjs/throttler` のみ追加)。

[Answer]: B

---

### Q4. ログ保管とローテーション（Maintainability / Reliability）

**問**: pino の出力先・保管期間は？

- **A. stdout / stderr のみ (推奨)**: Docker Compose で標準出力に流す、Docker のログドライバに委譲。永続化は実装しない。
- **B. ファイル + ローテーション**: pino-roll 等で日次ローテーション、7 日保管。
- **C. 外部サービス送信**: Datadog / Loki 等。

**AI 推奨**: **A**。理由: ローカル PoC、運用負荷最小、`docker logs` で十分閲覧可能。AuditLog (DB 永続化) と分離方針。

[Answer]: A

---

### Q5. ファイルサイズ・量の制限（Reliability / Storage）

**問**: 画像アップロードの追加制限は？

| 項目 | 値（要件 + AI 推奨） |
|---|---|
| 1 ファイルサイズ上限 | 5 MB (BR-IDEA-001 既定) |
| 1 アイデアあたりの添付数 | 0〜5 (BR-IDEA-001 既定) |
| 全体ストレージ上限 | **PoC では制限なし** (ローカル FS、運用で監視) |
| アップロード済ファイルの自動削除 | **なし** (Idea DELETED 化でも保持) |
| 画像最適化 (resize) | **なし** (PoC、原本保持) |
| ファイル名サニタイズ | **必須** (パストラバーサル対策、storedPath は CUID + sanitized filename) |

- **A.** AI 推奨で確定
- **B.** 修正したい

[Answer]: A

---

### Q6. パフォーマンス目標 SLI（Performance）

**問**: U0 の API エンドポイントの目標応答時間は？

- **A. p95 < 500ms / p99 < 1000ms (推奨)**: 標準的な Web アプリ目標、ローカル MySQL なら余裕で達成可能。
- **B. p95 < 200ms / p99 < 500ms**: より厳しい目標。
- **C. 設定しない**: PoC では目標値設定なし、機能優先。

**AI 推奨**: **A**。理由: NFR-1.2 (ページロード 2 秒) との整合、複数 API 呼び出し合計で 2 秒以内達成のため。Build and Test 時に確認。

[Answer]: A

---

### Q7. テストフレームワーク選定（Maintainability）

**問**: テスト環境の構成は？

| 用途 | AI 推奨 | 理由 |
|---|---|---|
| Backend Unit/Integration | **Jest** + **ts-jest** | NestJS 標準テンプレートに内蔵、最も枯れた選択 |
| Backend E2E | **Jest + supertest** | NestJS 標準、別 framework 不要 |
| Frontend Unit/Component | **Vitest** + **@testing-library/react** | Next.js 14 + ESM 互換、Jest より高速 |
| Frontend E2E | **Playwright** | クロスブラウザ、安定、debug 容易 |
| カバレッジ計測 | **istanbul (Jest 内蔵 + vitest 内蔵)** | デファクト |
| カバレッジ閾値 | 80% (NFR-7.1) | 強制適用 |

- **A.** AI 推奨で確定
- **B.** 修正したい

[Answer]: A

---

### Q8. CORS / セキュリティヘッダー（Security）

**問**: NestJS の CORS / Security headers の設定は？

**AI 推奨**:
- **CORS**: `frontend` (http://localhost:3000) のみ許可、credentials=true、Authorization ヘッダー許可
- **helmet**: 有効化 (XSS/clickjacking/MIME sniffing 等の標準対策)
- **CSRF**: SameSite=Strict Cookie + JWT (Authorization header) 構成のため CSRF token 不要 (二重 cookie 不採用)

- **A.** AI 推奨で確定
- **B.** 修正したい

[Answer]: A

---

### Q9. 環境変数管理（Maintainability / Security）

**問**: 環境変数の管理戦略は？

**AI 推奨**:
- `.env` (各開発者ローカル、git ignore)、`.env.example` (テンプレート、commit 対象)
- 必須 env: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `NODE_ENV`, `LOG_LEVEL`, `PORT`
- バリデーション: NestJS 起動時に `class-validator` で env スキーマ検証 (`config/env.validation.ts`)
- 欠落時: 起動失敗 (fail-fast)

- **A.** AI 推奨で確定
- **B.** 修正したい

[Answer]: A

---

### Q10. ESLint / Prettier / TS 設定（Maintainability）

**問**: コード品質ツールの設定は？

**AI 推奨**:
- **TypeScript**: strict ON、`noUnusedLocals` ON、`noImplicitAny` ON、`exactOptionalPropertyTypes` ON
- **ESLint**: `@typescript-eslint/recommended` + `plugin:@typescript-eslint/strict` + `eslint-config-prettier`
- **Prettier**: 標準設定 (semi=true, singleQuote=true, trailingComma=all, printWidth=100)
- **husky + lint-staged**: pre-commit で対象ファイルに `eslint --fix` + `prettier --write` を適用
- **コーディング規約**: ファイル ≤ 800 行 / 関数 ≤ 50 行 (NFR-6.2) は ESLint rule で強制

- **A.** AI 推奨で確定
- **B.** 修正したい

[Answer]: A

---

### Q11. 監視・観測性（Reliability）

**問**: ローカル PoC での観測性は？

- **A. 最小限 (推奨)**: pino ログ出力 + AuditLog DB + `/health` endpoint のみ。Metrics 収集なし。
- **B. Prometheus + Grafana**: メトリクス収集、Docker Compose に追加。
- **C. SigNoz / ELK**: フル観測スタック。

**AI 推奨**: **A**。理由: PoC、コスト/運用負荷最小、ログ閲覧は `docker logs` で十分。

[Answer]: A

---

### Q12. データバックアップ・リカバリ（Reliability）

**問**: MySQL のバックアップ戦略は？

- **A. 実装しない (PoC、ローカル開発)**: データ損失は許容、Cycle や User データは再投入で復旧
- **B. 開発者ローカルで定期 mysqldump**: 開発者の責任範囲、自動化なし
- **C. Docker volume の定期 snapshot**: 自動化あり

**AI 推奨**: **A**。理由: ローカル PoC のみ、本番要件外。本番化時に B/C 検討。

[Answer]: A

---

## 2. 生成成果物（回答受領後に作成）

- [ ] `aidlc-docs/construction/u0-shared-foundation/nfr-requirements/nfr-requirements.md`
  - 確定 NFR 一覧 (継承 + Q1〜Q12 確定値) を NFR ID 整理形式で記述
  - 各 NFR の検証方法 (テスト戦略 / 計測ポイント)
- [ ] `aidlc-docs/construction/u0-shared-foundation/nfr-requirements/tech-stack-decisions.md`
  - 確定済テック選定 (Q7 含む) と各選択理由
  - バージョン pin 戦略

## 3. 完了基準

- [x] nfr-requirements-plan.md 生成（本ファイル）
- [ ] Q1〜Q12 全部回答
- [ ] 曖昧性チェック完了
- [ ] 2 成果物生成
- [ ] ユーザーが NFR Requirements を承認

---

## 📋 ユーザーアクション

**Q1〜Q12 を確認してください。** AI 推奨が `[Answer]:` に既記入済みです。

- そのままで良ければ **"approve"** または "OK" → 2 成果物生成へ進む
- 修正したい質問があれば、該当 Q 番号と値を返してください
