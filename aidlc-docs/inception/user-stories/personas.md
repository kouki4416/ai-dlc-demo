# Personas — Ideation Portal

**Date**: 2026-05-03
**Format**: Light Version（Q1=A、5〜10行/ペルソナ）

---

## SUB - Submitter (投稿者) 「アキラ」
- **Role**: 全社員（〜100名規模、デフォルトロール）
- **Primary Goals**: 自分のアイデアを発信して認知される / 評価結果を見て改善する
- **Key Tasks**: 新規投稿、ドラフト保存、自身の投稿一覧確認、リーダーボード閲覧
- **Success Definition**: 投稿が完了し、評価サイクルでスコアと順位を確認できること
- **Notes**: アイデアは匿名で評価されるため、「評価される側」としての心理的安全性を重視

---

## PNL - Panel Member (評価パネル) 「ナナミ」
- **Role**: 管理者から任命された有資格者（部署横断的なシニア社員/有識者）
- **Primary Goals**: 公平・独立した視点で各アイデアをスコアリングする / バイアスを排除して評価品質を保つ
- **Key Tasks**: 評価対象一覧確認、3軸スコア入力（Feasibility/Impact/Innovation）、コメント残し、評価確定
- **Success Definition**: 全対象アイデアに対し独立してスコアを付け、評価期間内に確定できること
- **Notes**: 他パネルのスコアやコメントは評価期間中見えない（独立性確保）。投稿者は完全匿名で表示

---

## ADM - Administrator (管理者) 「マサト」
- **Role**: ポータル運営担当（人事/総務/イノベーション推進部門）
- **Primary Goals**: 評価サイクルを健全に回す / パネル構成を維持する / 表彰を確定する
- **Key Tasks**: パネル任命/解除、評価サイクル作成/終了、不適切投稿の削除、表彰確定、メトリクス閲覧
- **Success Definition**: サイクル終了時に上位3アイデアが正しく決定・表彰され、運営トラブルなくクローズすること
- **Notes**: 監査ログを残しながら最小限の運営介入に留める。匿名性原則を守る

---

## Persona ↔ Story Map

| Persona | 関与する Story ID 範囲 |
|---|---|
| SUB (Submitter) | US-001, US-002, US-003, US-004, US-007, US-008〜US-016, US-027, US-029〜US-035 |
| PNL (Panel Member) | US-002, US-004, US-007, US-017〜US-024, US-025〜US-030, US-034〜US-035 |
| ADM (Administrator) | US-002, US-004, US-005, US-006, US-007, US-027, US-031, US-036〜US-041 |

※ Story 詳細は `stories.md` を参照。複数ペルソナが関与するストーリーは横断的（例: ログイン US-002 は全ロール共通）。
