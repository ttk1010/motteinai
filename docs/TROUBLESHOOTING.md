# Troubleshooting

セットアップと運用でつまずいた症状と、その解決方法です。手順を最初からやり直すときは [SETUP_GUIDE.md](SETUP_GUIDE.md) を見てください。

> 各項目は下のテンプレートで書きます。短く、具体的に。

## テンプレート（新しい項目を足すときにコピー）

### <症状の短いタイトル>

- **Symptom:** 見えたもの（できればエラーの原文）
- **Cause:** なぜ起きたか
- **Fix:** 解決した手順
- **Notes:** 注意点・関連リンク・次に避ける方法

---

## 公開（GitHub Actions / Cloudflare）

### `wrangler deploy` → `register a workers.dev subdomain`

- **Symptom:** Actions の `Run npx wrangler deploy` が `You can either deploy your worker to one or more routes ... or register a workers.dev subdomain` で失敗する
- **Cause:** Cloudflare アカウントにまだ `workers.dev` のサブドメインがない
- **Fix:** ダッシュボード **Compute → Workers & Pages** を一度開く（自動で作られる）。右側「Account details」の **Subdomain** を確認・変更してから、Actions を **Re-run all jobs**
- **Notes:** [SETUP_GUIDE 1-5](SETUP_GUIDE.md#1-5-サブドメインを確認する)

### `d1 migrations apply` が失敗する

- **Symptom:** `Run npx wrangler d1 migrations apply mottenai --remote` で `Couldn't find a D1 DB` や `Authentication error [code: 10000]`
- **Cause:** 次のどれか
  - `wrangler.jsonc` の `database_id` が初期値（`00000000-...`）のまま、または別のデータベースのID
  - APIトークンに `D1 Edit` の権限がない
  - `CLOUDFLARE_ACCOUNT_ID` が違うアカウントを指している
- **Fix:** D1 の画面で Database ID を確認して `wrangler.jsonc` を直す。権限が足りなければトークンを作り直す（[SETUP_GUIDE 1-1](SETUP_GUIDE.md#1-1-apiトークンを作る)）

### 公開が急に失敗するようになった（以前は成功していた）

- **Symptom:** コードを変えていないのに `Authentication error` で公開が失敗する
- **Cause:** Cloudflare の APIトークンの有効期限切れ
- **Fix:** [APIトークンの更新](SETUP_GUIDE.md#apiトークンの更新)
- **Notes:** アプリ自体は動き続けます。止まるのは新しい公開だけです

### `git push` → `fatal error in commit_refs_rules`

- **Symptom:** push が `! [remote rejected] main -> main (fatal error in commit_refs_rules)` で拒否される
- **Cause:** GitHub 側の一時的なエラー（リポジトリのルール設定がなくても起きた）
- **Fix:** 数秒おいて push をやり直す

### サブドメインを変えたら、古い URL が開けない

- **Symptom:** `mottenai.<古い名前>.workers.dev` が表示されない
- **Cause:** サブドメインはアカウントに1つだけなので、変更すると URL も変わる
- **Fix:** 新しい URL を使う。Google のクライアントの「JavaScript 生成元」と「リダイレクト URI」も新しい URL に書き換える（書き換えないとログインできない）

---

## ログイン（Google）

### `エラー 400: redirect_uri_mismatch`

- **Symptom:** 「Googleで続ける」を押すと Google の画面で `redirect_uri_mismatch`
- **Cause:** Google のクライアントに登録したリダイレクト URI と、アプリの URL が1文字でも違う
- **Fix:** Google Auth Platform → **クライアント** → 作ったクライアントを開き、次と完全に一致させる
  - `https://mottenai.<サブドメイン>.workers.dev/auth/google/callback`
- **Notes:** `http` と `https`、末尾の `/`、サブドメインの綴りをよく見る。保存してから反映まで数分かかることがある

### `アクセスをブロック: Mottenai は Google の審査プロセスを完了していません`

- **Symptom:** ログインしようとすると `403: access_denied`
- **Cause:** アプリが「テスト中」で、ログインしようとした Gmail がテストユーザーに入っていない
- **Fix:** Google Auth Platform → **対象 → テストユーザー → ユーザーを追加**

### Google でログインしたのに、ログイン画面に戻る（「ログインできませんでした」）

- **Symptom:** Google のアカウント選択は通るが、アプリに戻ると「ログインできませんでした」
- **Cause:** Worker に `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` が入っていない、または値が違う
- **Fix:** Actions の最新の実行で「Sync Worker secrets」に `2 secrets successfully created` が出ているか見る。黄色い警告で飛ばされていたら、GitHub の Secrets の名前（大文字・アンダースコア）を確認して登録しなおし、**Re-run all jobs**
- **Notes:** Cloudflare の Worker → **Observability（Logs）** に `oauth callback failed` と原因が出る

---

## 登録・AI

### タグが付かない／全部「トップス・Tシャツ」になる

- **Symptom:** 登録した服が確認待ちに入るが、カテゴリなどのタグが初期値のまま
- **Cause:** Workers AI の呼び出しが失敗している。よくある原因は次の2つ
  - 1日の無料枠（1万 Neurons）を使い切った（UTC 0時＝日本時間9時にリセット）
  - 使っているモデルが無料プランで使えなくなった（`403` / `5035`）
- **Fix:** Worker → **Observability（Logs）** で `tagImage failed` のエラーを見る。モデルが原因なら `wrangler.jsonc` の `VISION_MODEL` を、無料で使える別の画像対応モデルに変えて公開しなおす
- **Notes:** タグが付かなくても、確認待ちで手で選べば提案には使えます

### 背景が切り抜かれない

- **Symptom:** 登録した服の写真に背景が残る
- **Cause:** Cloudflare Images の変換が使えない（無効、または月5,000回の無料枠を超えた）。ローカル環境では常に切り抜かれない
- **Fix:** ダッシュボード **Images** が有効か、今月の変換回数を確認する
- **Notes:** EC の商品画像で、モデルが着ている写真は人ごと残ります。服だけの写真を選んでください

### カメラが開かない

- **Symptom:** ＋を押しても黒い画面のまま、または「写真を選ぶ」しか出ない
- **Cause:** カメラの許可が拒否されている、または HTTPS ではない URL で開いている
- **Fix:** ブラウザの設定でこのサイトのカメラを許可する。iPhone は **設定 → Safari → カメラ**
- **Notes:** 許可しなくても「写真」「URL」から登録できます

---

## ローカル開発

### `npm run dev` → `it's necessary to set a CLOUDFLARE_API_TOKEN`

- **Symptom:** 開発サーバーが `In a non-interactive environment, it's necessary to set a CLOUDFLARE_API_TOKEN` で起動しない
- **Cause:** Workers AI はリモートでしか動かず、Vite プラグインが Cloudflare へ接続しようとする
- **Fix:** `CLOUDFLARE_API_TOKEN` を設定しない限りリモート接続は自動で無効になる（`vite.config.ts`）。`.dev.vars` に `MOCK_AI=1` を入れて仮のタグで動かす

### `SQLITE_CANTOPEN: unable to open database file`

- **Symptom:** ローカルで API が 500 を返し、ログに `SQLITE_CANTOPEN`
- **Cause:** 開発サーバーを動かしたまま `.wrangler/state` を消した
- **Fix:** 開発サーバーを止める → `npm run db:migrate:local` → 起動しなおす
