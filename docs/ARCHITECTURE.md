# Architecture

Mottenai の構成と、データの流れです。技術を選んだ理由は [04-tech-stack.md](04-tech-stack.md)、個々の設計判断は [adr/](adr/) にあります。

## 全体

```
スマホのブラウザ（PWA）
  React SPA ── 判定エンジン（src/shared/engine.ts）を画面側で実行
     │  fetch（同じドメイン、Cookie セッション）
     ▼
Cloudflare Worker（worker/index.ts, Hono）
  ├─ /auth/*  Google OAuth（Arctic）、セッション発行
  ├─ /api/*   アイテム・着た記録・気になる・天気・画像配信
  │
  ├─ D1       users / sessions / items / wear_logs / wants
  ├─ R2       元の写真・切り抜き画像（ユーザーIDで区切る）
  ├─ Images   背景の切り抜き（segment=foreground）
  ├─ Workers AI  写真からタグを判定（VISION_MODEL）
  └─ Open-Meteo  天気（1時間キャッシュ）
```

画面とAPIを1つの Worker から配信するので、CORS の設定は不要で、Cookie もそのまま使えます。

## ディレクトリ

```
src/
  shared/        画面とサーバーで共有する純粋なコード
    types.ts       アイテムのタグ・カテゴリ・型
    color.ts       Lab 色空間・色差・色名
    engine.ts      似ている度合い・相性・＋N通り・判定・今日のコーデ
    archetypes.ts  「買うと良い服」の見本集と順位付け
  lib/           API 呼び出し・画像の前処理・画面管理
  components/    ガラスの部品・スケルトン・シートなど
  screens/       各画面
worker/          Cloudflare Worker（API・認証・AI）
migrations/      D1 のテーブル定義
tests/           判定エンジンのテスト
public/          PWA の manifest・service worker・アイコン
```

## 判定はルール、AIはタグ付けだけ

数字の根拠（`似ている 87%`、`＋12通り`）をいつも同じにするため、判定は `src/shared/engine.ts` のルールで決めます。AIの仕事は「写真 → タグ（カテゴリ・柄・きちんと度など）」だけです。詳しくは [ADR 0001](adr/0001-rule-based-judgment.md)。

| 計算 | 中身 |
|---|---|
| 似ている度合い | 同じカテゴリの中で、種類 25%・色 50%（Lab 色差）・柄 10%・きちんと度 10%・シルエット 5%。85%以上で「ほぼ同じ」、70%以上で「似ている」 |
| 相性 | 色の相性（無彩色・ネイビー・ベージュ・デニムは何にでも合う）× きちんと度の差 × 柄の重なり × シルエット。0.6以上で「成り立つ」 |
| ＋N通り | その服を足したときに新しく成り立つコーデの数 |
| 判定 | ほぼ同じ物がある → 見送り／十分増えて似ている物がない → 買い／それ以外 → 保留 |

計算は画面側で行います。1人の手持ちは多くても数百着なので、全件の比較がその場で終わります。

## 登録の流れ

```
撮影 ──▶ ブラウザで縮小（長辺1280px）・主色を測る
     ──▶ POST /api/items（R2 に保存、状態 processing で D1 に記録）
     ──▶ すぐ応答（次を撮れる）
            └─ waitUntil で裏の処理
                 ├─ Images で背景を切り抜き → R2
                 └─ Workers AI でタグ付け
                 → 状態を review（確認待ち）に
画面は processing のアイテムがある間だけ 1.5 秒ごとに再取得
```

AIや切り抜きが失敗しても、アイテムは「確認待ち」に入り、手でタグを選べば提案に使えます（[ADR 0002](adr/0002-free-tier-and-graceful-degradation.md)）。

## 買う前チェックの流れ

```
撮影 ──▶ POST /api/analyze（保存せずにタグだけ返す）
     ──▶ 画面で checkCandidate(タグ, 手持ち)
     ──▶ 判定・＋N通り・似ている手持ち・合う手持ち
     ──▶ 「買った」: 同じ写真とタグで POST /api/items（AIを再実行しない）
```

## データ

| テーブル | 内容 |
|---|---|
| `users` | Google のアカウント、服の傾向、天気の地域 |
| `sessions` | ログインのセッション（トークンの SHA-256 だけを保存、30日、残り半分で延長） |
| `items` | 服1着ごとのタグ・画像のキー・着た回数 |
| `wear_logs` | 着た記録（日付とアイテムIDの配列） |
| `wants` | 気になるリスト（撮った写真）と買い物リスト（見本） |

画像は R2 に `<ユーザーID>/<アイテムID>/original.jpg` と `cutout.png` で保存し、`/api/images/*` でログイン中の本人にだけ返します。

## 秘密の値

| 値 | 置き場所 | Worker への渡し方 |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` | GitHub Secrets | 公開にだけ使う |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | GitHub Secrets | 公開のたびに `wrangler secret bulk` で反映 |

秘密の値は GitHub だけで管理します（[ADR 0004](adr/0004-secrets-in-github.md)）。
