# U0 Shared Foundation — NFR Requirements

**Date**: 2026-05-05
**Status**: Approved
**Source**: `requirements.md` NFR-1〜NFR-7 (継承) + nfr-requirements-plan Q1〜Q12 (確定)

このドキュメントは U0 が遵守すべき非機能要件を整理し、各 NFR の **検証方法** と **計測ポイント** を明記します。後続ユニットも本ドキュメントの NFR を継承します。

---

## 1. NFR 一覧（カテゴリ別整理）

### 1.1 Performance (性能)

| ID | 要件 | 値 | 出典 | 検証方法 |
|---|---|---|---|---|
| PERF-001 | 想定同時接続数 | 100 ユーザー | NFR-1.1 | k6 / autocannon で 100 同時 conn 負荷テスト (Build and Test) |
| PERF-002 | ページ初期ロード | < 2 秒 | NFR-1.2 | Lighthouse / Playwright trace、ローカル基準 |
| PERF-003 | SSE 反映遅延 | < 30 秒 | NFR-1.3 | SSE クライアントで publish 〜 onmessage の経過時間計測 |
| PERF-004 | API 応答時間 p95 | < 500ms | Q6 | k6 によるシナリオ負荷テスト時の p95 |
| PERF-005 | API 応答時間 p99 | < 1000ms | Q6 | 同上 |
| PERF-006 | DB Connection Pool | デフォルト (CPU*2+1) | Q2 | Prisma 起動時の num_physical_cpus 自動設定確認 |
| PERF-007 | SSE 実装方式 | インメモリ EventEmitter | Q1 | コードレビューで Redis 等の外部依存なきこと確認 |

### 1.2 Scalability (拡張性)

| ID | 要件 | 値 | 出典 |
|---|---|---|---|
| SCALE-001 | 単一プロセス | Backend 単一 Node プロセスで全機能稼働 | Q1 |
| SCALE-002 | 水平スケール対応 | 不要 (PoC、ローカル単一コンテナ) | Q1 |
| SCALE-003 | 将来拡張余地 | NestJS Module 境界を維持し、後でマイクロサービス化可能な構造 | unit-of-work.md |

### 1.3 Security (セキュリティ)

| ID | 要件 | 値 | 出典 | 検証方法 |
|---|---|---|---|---|
| SEC-001 | 機密度 | 標準 (GDPR/個情法レベル) | NFR-2.1 | レビュー |
| SEC-002 | パスワード保管 | bcrypt cost=10 でハッシュ化、平文禁止 | NFR-2.2 / BR-AUTH-002 | コードレビュー + DB 直接確認テスト |
| SEC-003 | HTTPS | 本番のみ必須 (ローカル HTTP 可) | NFR-2.3 | 本番デプロイ時の構成確認 |
| SEC-004 | XSS 対策 | フレームワーク標準 (Next.js / React) + helmet | NFR-2.4 / Q8 | OWASP ZAP 等の自動スキャン (Build and Test) |
| SEC-005 | CSRF 対策 | JWT (Authorization header) + SameSite=Strict cookie で対応 | NFR-2.4 / Q8 | コードレビュー |
| SEC-006 | SQL インジェクション対策 | Prisma の prepared statements | NFR-2.4 | コードレビュー (raw SQL 不使用) |
| SEC-007 | 認可テスト | パネル独立性のテスト必須 | NFR-2.5 | E2E テストで他パネルスコア取得試行 → 403 確認 |
| SEC-008 | Security 拡張ルール | 適用しない (J1=No) | NFR-2.6 | aidlc-state Extension Config |
| SEC-009 | Rate Limiting | 認証エンドポイントのみ 5 req/min/IP | Q3 | 統合テストで 6 回連続 → 429 確認 |
| SEC-010 | CORS | frontend (localhost:3000) のみ許可、credentials=true | Q8 | コードレビュー |
| SEC-011 | Security Headers | helmet 有効化 (XSS / clickjacking / MIME sniff) | Q8 | curl -I で各ヘッダ確認 |
| SEC-012 | JWT Secret | env var、32 文字以上、起動時バリデーション | Q9 | 起動時 fail-fast 動作確認 |
| SEC-013 | ファイル名サニタイズ | パストラバーサル対策必須 | Q5 | 単体テストで `../etc/passwd` 等の試行 |
| SEC-014 | 監査ログ | AuditLog DB 永続化、PII 含めない | BR-AUDIT-003 | コードレビュー |

### 1.4 Reliability (信頼性)

| ID | 要件 | 値 | 出典 | 検証方法 |
|---|---|---|---|---|
| REL-001 | SLA | 規定なし (ローカル PoC) | NFR-5.1 | — |
| REL-002 | ドラフト保存信頼性 | 保存成功表示 + 失敗時リトライ | NFR-5.2 | 統合テスト + ネットワーク障害シミュレーション |
| REL-003 | DB トランザクション | Cycle 終了処理 / Score 確定で atomic | BR-CYCLE-003 | 統合テストでロールバック動作確認 |
| REL-004 | ヘルスチェック | /health, /health/db, /health/ready | functional-design Q14 | curl で 200 OK 確認 |
| REL-005 | バックアップ | 実装しない (PoC) | Q12 | — |
| REL-006 | エラー伝搬 | 共通 Exception Filter で統一形式変換 | functional-design BR-Error | 統合テストで各エラーコードのレスポンス確認 |

### 1.5 Maintainability (保守性)

| ID | 要件 | 値 | 出典 | 検証方法 |
|---|---|---|---|---|
| MAINT-001 | TypeScript | strict ON、noUnusedLocals、noImplicitAny、exactOptionalPropertyTypes | NFR-6.1 / Q10 | tsconfig.json 検証 + tsc --noEmit |
| MAINT-002 | ファイル長 | ≤ 800 行 | NFR-6.2 | ESLint custom rule (max-lines) |
| MAINT-003 | 関数長 | ≤ 50 行 | NFR-6.2 | ESLint rule (max-lines-per-function) |
| MAINT-004 | ESLint | @typescript-eslint/strict + prettier 連携 | Q10 | npm run lint で 0 errors |
| MAINT-005 | Prettier | semi=true / singleQuote=true / trailingComma=all / printWidth=100 | Q10 | .prettierrc 検証 |
| MAINT-006 | pre-commit | husky + lint-staged で自動 lint/format | Q10 | コミット時自動実行 |
| MAINT-007 | 環境変数 | .env (ignore) / .env.example (commit)、起動時 validation、欠落時 fail-fast | Q9 | 起動時動作確認 |
| MAINT-008 | コーディング規約 | KISS / DRY / YAGNI / Immutability | ~/.claude/rules/ecc/coding-style.md | コードレビュー |

### 1.6 Testability (テスト性)

| ID | 要件 | 値 | 出典 | 検証方法 |
|---|---|---|---|---|
| TEST-001 | カバレッジ | ≥ 80% (Unit + Integration) | NFR-7.1 | jest/vitest --coverage 閾値強制 |
| TEST-002 | TDD | 推奨 (主要ロジック) | NFR-7.3 | レビュー時の commit 履歴確認 |
| TEST-003 | PBT 拡張 | 適用しない (J2=No) | NFR-7.2 | aidlc-state Extension Config |
| TEST-004 | Backend 単体/統合 | Jest + ts-jest | Q7 | jest.config.ts |
| TEST-005 | Backend E2E | supertest (NestJS 標準) | Q7 | test/*.e2e-spec.ts |
| TEST-006 | Frontend 単体/コンポーネント | Vitest + @testing-library/react | Q7 | vitest.config.ts |
| TEST-007 | Frontend E2E | Playwright | Q7 | playwright.config.ts |
| TEST-008 | テスト構造 | AAA (Arrange-Act-Assert) パターン | ~/.claude/rules/ecc/testing.md | レビュー |
| TEST-009 | テスト命名 | 振る舞いを表す描述的な名前 | ~/.claude/rules/ecc/testing.md | レビュー |

### 1.7 Usability / Accessibility (使いやすさ / アクセシビリティ)

| ID | 要件 | 値 | 出典 | 検証方法 |
|---|---|---|---|---|
| UX-001 | UI 言語 | 日本語のみ | NFR-3.1 | レビュー |
| UX-002 | 多言語対応 | 実装しない | NFR-3.2 | レビュー |
| UX-003 | WCAG 2.2 準拠 | 必須としない | NFR-4.1 | — |
| UX-004 | キーボード操作 | フォーム全体でキーボード操作可能 | NFR-4.2 | Playwright で Tab 操作テスト |
| UX-005 | 画像 alt 属性 | 必須 | NFR-4.2 | ESLint jsx-a11y rule |
| UX-006 | エラーメッセージ | 日本語、ユーザー視点 | BR-Error | レビュー |
| UX-007 | Toast 通知 | 成功/失敗の即時フィードバック | functional-design Q13 | レビュー |

### 1.8 Observability (観測性)

| ID | 要件 | 値 | 出典 |
|---|---|---|---|
| OBS-001 | ログ形式 | JSON 構造化 (pino) | functional-design Q12 |
| OBS-002 | ログレベル | info (default) / debug (dev) / error | functional-design Q12 |
| OBS-003 | ログ出力先 | stdout のみ (Docker logs ドライバに委譲) | Q4 |
| OBS-004 | 監査ログ | AuditLog DB 永続化 (10 アクション) | functional-design BR-AUDIT |
| OBS-005 | メトリクス収集 | 実装しない (PoC) | Q11 |
| OBS-006 | Health endpoints | /health, /health/db, /health/ready | functional-design Q14 |

### 1.9 Storage (ストレージ)

| ID | 要件 | 値 | 出典 |
|---|---|---|---|
| STORE-001 | DB | MySQL 8.x (Docker volume) | requirements G3 |
| STORE-002 | 画像保存 | ローカル FS `uploads/` | application-design Q5 |
| STORE-003 | ファイルサイズ上限 | 1 ファイル ≤ 5MB | BR-IDEA-001 |
| STORE-004 | 添付数上限 | 0〜5 / アイデア | BR-IDEA-001 |
| STORE-005 | 全体ストレージ上限 | 制限なし (運用で監視) | Q5 |
| STORE-006 | 自動削除 | なし (Idea DELETED 化でも保持) | Q5 |
| STORE-007 | 画像最適化 | なし (原本保持) | Q5 |
| STORE-008 | バックアップ | 実装しない (PoC) | Q12 |

---

## 2. NFR 検証マトリックス（Build and Test ステージで実施）

| カテゴリ | 検証ツール | タイミング |
|---|---|---|
| Performance | k6 / autocannon | Build and Test 後半 |
| Security | OWASP ZAP / npm audit / 認可テスト | Build and Test |
| Reliability | 統合テスト + chaos test (障害シミュ) | Build and Test |
| Maintainability | ESLint / tsc / Prettier | 各ユニット per-unit ループ + CI |
| Testability | jest/vitest --coverage | 各ユニット per-unit ループ |
| Accessibility | jsx-a11y ESLint + Playwright a11y | Build and Test |

---

## 3. NFR 違反時の対応方針

| Severity | 例 | 対応 |
|---|---|---|
| **CRITICAL** | パスワード平文保存 / 認可漏れ | **即座にブロック**、リリース不可 |
| **HIGH** | カバレッジ < 80% / p95 > 1000ms | フィックスまでマージ不可 |
| **MEDIUM** | ログ未構造化 / 軽微な lint エラー | チケット起票、次サイクル対応 |
| **LOW** | 命名軽微指摘 | 任意改善 |

---

## 4. NFR 追跡責任

- **U0 が責任を負う**: ALL (横断基盤として全 NFR の土台を提供)
- **後続ユニット (U1〜U6) は U0 の基盤を利用しつつ**:
  - 担当 API の PERF-004/005 (p95/p99) を満たす
  - 担当 DTO の MAINT-002/003 (行数) を遵守
  - 担当機能の TEST-001 (カバレッジ 80%) を達成
  - 担当ロールガードで SEC-007 (認可テスト) を実装
