# Unit of Work — Story Map

**Date**: 2026-05-05
**Status**: Generated (PART 2)
**Source**: `stories.md` (41 stories) + `unit-of-work.md` + Q8=A (跨ぎ Story 推奨採用)

---

## 1. 全 41 Stories のユニット割当（Epic ↔ Unit ↔ Story Triangle）

### EP-AUTH（認証 & ロール管理）→ 主に U1（US-007 のみ U0）

| Story | Priority | 内容 | Unit | 配置根拠 |
|---|---|---|---|---|
| US-001 | Must | アカウント登録 | **U1** | EP-AUTH 直系 |
| US-002 | Must | ログイン | **U1** | EP-AUTH 直系 |
| US-003 | Should | パスワードリセット | **U1** | EP-AUTH 直系 |
| US-004 | Must | ログアウト | **U1** | EP-AUTH 直系 |
| US-005 | Must | パネルメンバー任命 | **U1** | UsersModule (User.role 更新) |
| US-006 | Should | パネルメンバー解除 | **U1** | UsersModule (User.role 更新) |
| US-007 | Must | ロール別ナビゲーション | **U0** | Q8=A: 共通 Navigation 骨格は U0、各ユニットが項目を提供 |

### EP-SUBMIT（アイデア投稿）→ 全て U2

| Story | Priority | 内容 | Unit | 配置根拠 |
|---|---|---|---|---|
| US-008 | Must | 新規アイデア作成 | **U2** | IdeasModule 直系 |
| US-009 | Must | ドラフト自動保存 | **U2** | IdeasModule 直系 |
| US-010 | Must | ドラフト手動保存 | **U2** | IdeasModule 直系 |
| US-011 | Should | 画像添付 | **U2** | IdeasModule 直系（uploads/ 利用） |
| US-012 | Must | ドラフト一覧 | **U2** | IdeasModule 直系 |
| US-013 | Must | ドラフトを公開 | **U2** | IdeasModule 直系（SSE publish trigger） |
| US-014 | Must | 自分の投稿一覧 | **U2** | IdeasModule 直系 |
| US-015 | Must | 投稿後編集不可 | **U2** | IdeasModule 直系（status=PUBLISHED で immutable） |
| US-016 | Must | 入力バリデーション | **U2** | IdeasModule 直系（共通 Validation 基盤は U0） |

### EP-EVAL（評価 & スコアリング）→ 全て U3

| Story | Priority | 内容 | Unit | 配置根拠 |
|---|---|---|---|---|
| US-017 | Must | 評価対象アイデア一覧 | **U3** | EvaluationsModule 直系 |
| US-018 | Must | アイデア詳細閲覧（匿名） | **U3** | EvaluationsModule 直系（U2 経由で匿名化） |
| US-019 | Must | 3軸スコア入力 | **U3** | EvaluationsModule 直系 |
| US-020 | Should | コメント入力 | **U3** | EvaluationsModule 直系 |
| US-021 | Must | スコア修正 | **U3** | EvaluationsModule 直系（Cycle OPEN 中のみ） |
| US-022 | Must | 評価確定 | **U3** | EvaluationsModule 直系（SSE publish trigger） |
| US-023 | Should | 同時並行評価ダッシュボード | **U3** | EvaluationsModule 直系（パネル個人用進捗） |
| US-024 | Must | 他パネルスコア非公開 | **U3** | EvaluationsModule 直系（API レベルガード） |

### EP-DASH（ダッシュボード & 分析）→ 主に U4（US-029 のみ U0）

| Story | Priority | 内容 | Unit | 配置根拠 |
|---|---|---|---|---|
| US-025 | Must | 全アイデアリーダーボード | **U4** | DashboardModule 直系 |
| US-026 | Should | 軸別ランキング | **U4** | DashboardModule 直系 |
| US-027 | Must | アイデア詳細ページ | **U4** | Q8=A: Eval/匿名公開状態の表示も含むため Dashboard 文脈 |
| US-028 | Should | 投稿状況/評価進捗表示 | **U4** | DashboardModule 直系 |
| US-029 | Must | 準リアルタイム更新 | **U0** | Q8=A: SSE Hub 基盤は U0（U2/U3/U6 が Publisher として利用） |
| US-030 | Should | ディメンション別比較 | **U4** | DashboardModule 直系 |

### EP-REC（表彰 & 殿堂）→ U5 / U6 分割

| Story | Priority | 内容 | Unit | 配置根拠 |
|---|---|---|---|---|
| US-031 | Must | 評価サイクル終了処理（自動集計） | **U6** | Q5=A: Cycle 全体所有 = U6 |
| US-032 | Must | 上位3アイデア決定 | **U6** | Q5=A: Cycle 終了処理の一部 |
| US-033 | Must | 上位3名の氏名自動公開 | **U6** | Q5=A: 匿名解除 = U6 の責務 |
| US-034 | Must | 表彰殿堂ページ | **U5** | RecognitionModule 直系（読み取りビュー） |
| US-035 | Should | 殿堂履歴 | **U5** | RecognitionModule 直系（読み取りビュー） |

### EP-ADMIN（管理機能）→ 全て U6

| Story | Priority | 内容 | Unit | 配置根拠 |
|---|---|---|---|---|
| US-036 | Must | 評価サイクル作成 | **U6** | CyclesModule 直系 |
| US-037 | Must | 評価サイクル終了 | **U6** | CyclesModule（US-031 のトリガー） |
| US-038 | Must | パネルメンバー一覧管理 | **U6** | Q8=A: Admin パネル内（U1 は API 提供のみ、画面は U6） |
| US-039 | Should | 不適切投稿削除 | **U6** | AdminModule 直系（U2 IdeasService 経由） |
| US-040 | Could | アーカイブ済みデータ閲覧 | **U6** | AdminModule 直系 |
| US-041 | Should | 管理者向けメトリクス閲覧 | **U6** | AdminModule 直系 |

---

## 2. ユニット別 Story サマリ

| Unit | Stories | Must | Should | Could | 主担当 Epic |
|---|---|---|---|---|---|
| **U0** Shared Foundation | 2 (US-007, US-029) | 2 | 0 | 0 | 横断 (EP-AUTH/EP-DASH 一部) |
| **U1** Auth & Users | 6 (US-001〜US-006) | 4 | 2 | 0 | EP-AUTH |
| **U2** Idea Submission | 9 (US-008〜US-016) | 8 | 1 | 0 | EP-SUBMIT |
| **U3** Evaluation | 8 (US-017〜US-024) | 6 | 2 | 0 | EP-EVAL |
| **U4** Dashboard | 5 (US-025〜US-028, US-030) | 2 | 3 | 0 | EP-DASH |
| **U5** Recognition | 2 (US-034, US-035) | 1 | 1 | 0 | EP-REC |
| **U6** Admin & Cycles | 9 (US-031〜US-033, US-036〜US-041) | 6 | 2 | 1 | EP-ADMIN + Cycle |
| **U4 +US-027** | (US-027 を U4 に追加) | +1 | 0 | 0 | (跨ぎ) |
| **計** | **41** | **29** | **11** | **1** | |

検算: 2 + 6 + 9 + 8 + (5+1=6) + 2 + 9 = **41** ✓
Must: 2 + 4 + 8 + 6 + (2+1=3) + 1 + 6 = **30** ❌（実際 29）

**訂正**: US-027 (Must) を U4 に含めると U4 Must=3、計算合いません。再検証:

| 項目 | 計上 |
|---|---|
| EP-AUTH 7 stories (Must=4 [US-001/002/004/005], Should=2 [US-003/006], Must=1 [US-007]) | Must=5, Should=2 |
| EP-SUBMIT 9 stories (Must=8 [US-008,009,010,012,013,014,015,016], Should=1 [US-011]) | Must=8, Should=1 |
| EP-EVAL 8 stories (Must=6 [US-017,018,019,021,022,024], Should=2 [US-020,023]) | Must=6, Should=2 |
| EP-DASH 6 stories (Must=3 [US-025,027,029], Should=3 [US-026,028,030]) | Must=3, Should=3 |
| EP-REC 5 stories (Must=4 [US-031,032,033,034], Should=1 [US-035]) | Must=4, Should=1 |
| EP-ADMIN 6 stories (Must=3 [US-036,037,038], Should=2 [US-039,041], Could=1 [US-040]) | Must=3, Should=2, Could=1 |

合計 Must: 5+8+6+3+4+3 = **29** ✓
合計 Should: 2+1+2+3+1+2 = **11** ✓
合計 Could: 1 ✓
総計: **41** ✓

ユニット別再集計（US-007=U0, US-029=U0, US-027=U4 維持, US-031〜033=U6 移管）:

| Unit | Stories | Must | Should | Could |
|---|---|---|---|---|
| U0 | 2 (US-007, US-029) | 2 | 0 | 0 |
| U1 | 6 (US-001〜US-006) | 4 | 2 | 0 |
| U2 | 9 (US-008〜US-016) | 8 | 1 | 0 |
| U3 | 8 (US-017〜US-024) | 6 | 2 | 0 |
| U4 | 5 (US-025, US-026, US-027, US-028, US-030) | 2 | 3 | 0 |
| U5 | 2 (US-034, US-035) | 1 | 1 | 0 |
| U6 | 9 (US-031, US-032, US-033, US-036, US-037, US-038, US-039, US-040, US-041) | 6 | 2 | 1 |
| **計** | **41** | **29** | **11** | **1** ✓ |

✅ 検算合致。

---

## 3. ユニット境界をまたぐストーリーの所属判定根拠（Q8=A 詳細）

### US-007 ロール別ナビゲーション → **U0**
- **理由**: Navigation は全ロールの全画面で表示される共通 UI 要素。各ユニットが「自分のメニュー項目」を declarative に提供し、U0 の Navigation コンポーネントが収集・レンダリング。
- **実装方針**: Frontend で `nav.config.ts` に各ユニットがメニュー項目を export、`Navigation.tsx` (U0) が条件分岐込みで描画。
- **代替案 (採用せず)**: U1 に置く案 — Auth に責任が集中しすぎ、また Navigation はロール別なだけで認証ロジックそのものではない。

### US-027 アイデア詳細ページ → **U4**
- **理由**: 詳細ページは Cycle OPEN 中（評価対象として閲覧）と Cycle CLOSED 後（公開状態で閲覧）の両方を含む。Dashboard の読み取りビュー文脈で統合。
- **実装方針**: `/ideas/[id]` のルートを U4 が所有。表示する内容は Cycle 状態 + ロール条件で分岐（PNL は匿名表示、ADM/SUB 投稿者は氏名表示など）。
- **代替案 (採用せず)**: U2 に置く案 — 投稿側責務（書き込み）と閲覧側責務（読み取り）を分離した方が clean。

### US-029 準リアルタイム更新 → **U0**
- **理由**: SSE Hub は Publisher / Subscriber の Pub/Sub 基盤。Publisher は U2 (idea.published) / U3 (score.confirmed) / U6 (cycle.closed) と複数。Hub は単一責任の横断技術基盤。
- **実装方針**: `SseHubModule` (U0) が `EventBus` パターンで Publisher API と Subscriber エンドポイント `GET /events` を提供。各 Publisher ユニットは `sseHub.publish(eventName, payload)` を呼ぶだけ。
- **代替案 (採用せず)**: U4 に置く案 — Subscriber 主体は Dashboard だが Publisher は複数で、Hub を 1 ユニットに閉じ込めると依存方向が逆転する。

### US-031〜US-033 サイクル終了処理 → **U6**（Q5=A）
- **理由**: 自動集計 / 上位3決定 / 氏名公開 は Cycle のライフサイクル管理の一部。Cycle 所有ユニット (U6) が一貫してトランザクション内で実施。
- **実装方針**: `CyclesService.close(cycleId)` が `$transaction` 内で集計→ranking→匿名解除を行う。U3 から `aggregateScores()` を呼ぶが、決定処理自体は U6。
- **代替案 (採用せず)**: U5 (Recognition) に置く案 — Recognition は読み取りビュー専門に保ちたい。書き込み処理が混入すると責務が膨らむ。

### US-038 パネルメンバー一覧管理 → **U6**
- **理由**: 管理画面 UI は U6 (Admin) の責務。User データの CRUD API は U1 が提供。U6 は U1 の `UsersService` を呼び出して画面構築。
- **実装方針**: `/admin/panel` (U6 FE) が `usersService.findAll({role: 'PANEL'})` を呼ぶ。任命/解除のボタンも U6 画面内で `usersService.assignRole(userId, 'PANEL')` を呼ぶ。
- **代替案 (採用せず)**: U1 に置く案 — Admin UI は他の管理画面と統合した方が UX 上も自然（U6 のサイドバーから一貫アクセス）。

---

## 4. Persona ↔ Unit Map（補足）

`personas.md` の 3 ペルソナとの対応:

| Persona | 主に触れるユニット | 説明 |
|---|---|---|
| **SUB** (Submitter) | U1, U2, U4, U5 | ログイン → 投稿（U2）→ 自分の投稿確認（U2）→ ダッシュボードで自分の順位確認（U4）→ 殿堂閲覧（U5） |
| **PNL** (Panel Member) | U1, U3, U4 | ログイン → 評価（U3）→ ダッシュボードで全体傾向確認（U4） |
| **ADM** (Admin) | U1, U6, (全部) | ログイン → サイクル管理（U6）→ パネル管理（U6）→ メトリクス（U6）→ 全画面アクセス可能 |

U0 は全 Persona が間接的に利用（SSE 経由のリアルタイム反映、共通 Layout/Navigation）。

---

## 5. 完了基準

- [x] 全 41 stories が 1 つのユニットに割当済み
- [x] Persona ↔ Unit のマッピング整合
- [x] 跨ぎ Story の所属根拠を文書化
- [x] Story Count 合計 = 41 (検算合致)
- [x] Must/Should/Could 内訳整合 (29/11/1)
