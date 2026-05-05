# Story Generation Plan — Ideation Portal

**Date**: 2026-05-03
**Status**: ✅ PART 2 Generation Complete (2026-05-03T00:50:00Z)

このプランは User Stories ステージの **PART 1 (Planning)** で作成され、ユーザーが埋め込み質問に回答・承認した後、**PART 2 (Generation)** で実行されます。

---

## Methodology Overview

- **Source**: `aidlc-docs/inception/requirements/requirements.md`
- **Frameworks**: INVEST 原則 (Independent / Negotiable / Valuable / Estimable / Small / Testable) を遵守
- **Personas**: Submitter / Panel Member / Administrator の3種を最低限含む
- **Acceptance Criteria**: 各ストーリーに必須

---

## Story Breakdown Approach Options

| Approach | 説明 | 本プロジェクトでの利点 | 欠点 |
|---|---|---|---|
| **User Journey-Based** | 投稿 → 評価 → 集計 → 表彰の流れを1本のジャーニーとして辿る | 横断的な体験理解、シナリオテストが組みやすい | ロール横断のため粒度が大きくなりがち |
| **Feature-Based** | 機能領域 (Auth / Submission / Evaluation / Dashboard / Recognition / Admin) でグループ化 | 実装ユニット分割と直結、Construction フェーズへの橋渡しが明確 | ジャーニー視点が薄れる |
| **Persona-Based** | Submitter / Panel / Admin ごとにストーリーをまとめる | ロール別の MVP 範囲を決めやすい | 機能間の相互作用が見えにくい |
| **Domain-Based** | 業務ドメイン (アイデア管理 / 評価ドメイン / 表彰ドメイン) でまとめる | DDD 志向設計と親和性が高い | 小規模 MVP には過剰設計の懸念 |
| **Epic-Based (Hybrid)** | Epic = 機能領域、子ストーリー = ペルソナ別の操作 | 機能とペルソナの両軸を保持、ナビゲーションしやすい | ドキュメントが少し冗長になる |

**AI 推奨**: **Epic-Based (Hybrid)** = Epic は Feature-Based、子ストーリーは Persona ごとのユーザーストーリーとして定義。ただし最終決定はユーザーの回答に従う。

---

## Mandatory Artifacts (PART 2 で生成)

- [ ] `aidlc-docs/inception/user-stories/personas.md` — 3ペルソナ (Submitter / Panel / Admin) の archetype, goals, frustrations, key tasks
- [ ] `aidlc-docs/inception/user-stories/stories.md` — INVEST 準拠ストーリー一覧 + 受け入れ基準 + ペルソナマップ

---

## Plan Checklist (PART 2 Generation で順次実行)

- [x] **Step G-1**: ペルソナ定義 — 3ペルソナの archetype / goals / pain points / key tasks を生成
- [x] **Step G-2**: Epic 定義 — Q3 で選択した breakdown approach に従い、機能領域ごとの Epic を抽出 (例: EP-AUTH, EP-SUBMIT, EP-EVAL, EP-DASH, EP-REC, EP-ADMIN)
- [x] **Step G-3**: ストーリー生成 — 各 Epic 配下に "As a [persona], I want [action], so that [outcome]" 形式で User Story を作成
- [x] **Step G-4**: 受け入れ基準付与 — 各ストーリーに Q4 で選択した形式で AC を記述
- [x] **Step G-5**: 優先度付与 — Q5 で選択した方式で各ストーリーにラベル付け
- [x] **Step G-6**: ペルソナ ↔ ストーリーマッピング — `personas.md` の末尾に各ペルソナが関与するストーリー ID 一覧を記載
- [x] **Step G-7**: INVEST 自己レビュー — 生成済みストーリーが Independent / Negotiable / Valuable / Estimable / Small / Testable を満たすか自己点検
- [x] **Step G-8**: ファイル出力と aidlc-state.md 更新

---

## Embedded Questions (User Input Required)

### Question Q1: ペルソナの粒度
ペルソナドキュメントの詳細度はどれにしますか?

A) ライト版 — 名前・ロール・主要目標・主要タスクのみ（5〜10行/ペルソナ）
B) 標準版 — A) + デモグラフィック仮想例・典型的な心理・主要な摩擦点・成功定義（15〜25行/ペルソナ）
C) フル版 — B) + 行動パターン・ツール環境・引用風 quote・典型的な1日の流れ
D) Other (please describe after [Answer]: tag below)

[Answer]: A

### Question Q2: ストーリー粒度
ユーザーストーリーの粒度はどれにしますか?

A) ファイン (1日以内で実装可能、受け入れ基準2〜4個。ストーリー数 30〜50想定)
B) ミディアム (1〜3日想定、受け入れ基準3〜6個。ストーリー数 15〜25想定)
C) ラージ (1週間想定、受け入れ基準5〜10個。ストーリー数 8〜15想定)
D) Other (please describe after [Answer]: tag below)

[Answer]: A

### Question Q3: ブレークダウン方針
ストーリーの整理方法はどれにしますか?

A) Feature-Based — 機能領域 (Auth/Submission/Evaluation/Dashboard/Recognition/Admin) ごとに整理
B) Persona-Based — Submitter/Panel/Admin ごとに整理
C) Epic-Based (Hybrid 推奨) — Epic は機能領域、子ストーリーは Persona ごとに ※ AI 推奨
D) User Journey-Based — 投稿〜表彰の一連のジャーニー単位で整理
E) Other (please describe after [Answer]: tag below)

[Answer]: C

### Question Q4: 受け入れ基準フォーマット
受け入れ基準 (Acceptance Criteria) の記述形式はどれにしますか?

A) Given-When-Then (BDD スタイル、テスト変換しやすい)
B) シンプルな箇条書き (条件リスト)
C) ハイブリッド — 主要シナリオは Given-When-Then、補助条件は箇条書き
D) Other (please describe after [Answer]: tag below)

[Answer]: A

### Question Q5: 優先度ラベリング
ストーリー優先度の付け方はどれにしますか?

A) MoSCoW (Must / Should / Could / Won't)
B) 数値プライオリティ (1〜5)
C) MVP / Phase 2 / Future の3階層
D) 優先度ラベルなし (順番のみで暗黙的に表現)
E) Other (please describe after [Answer]: tag below)

[Answer]: A

### Question Q6: MVP スコープ確認
本プロジェクトの **MVP (最小実装)** に含めるべき機能領域はどれですか? (複数 OK)

A) Auth + Submission + Evaluation + Dashboard + Recognition + Admin **全部**
B) Auth + Submission + Evaluation + Recognition (ダッシュボード・分析・管理は Phase 2)
C) Auth + Submission + Evaluation + Dashboard + Recognition (管理は最低限のみ)
D) Other (please describe after [Answer]: tag below)

[Answer]: A

### Question Q7: ストーリー ID 体系
ストーリー ID の命名規則はどれにしますか?

A) 連番のみ (US-001, US-002, ...)
B) Epic コード + 連番 (EP-AUTH-001, EP-SUBMIT-001, ...)
C) ペルソナコード + 連番 (SUB-001, PNL-001, ADM-001, ...)
D) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## 回答完了の合図

すべての `[Answer]:` を埋めたら、チャットで「**done**」「**完了**」などとお知らせください。
回答を分析後、PART 2 (Generation) の実行可否について承認を求めます。
