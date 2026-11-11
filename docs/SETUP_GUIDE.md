# セットアップ手順書（Cloudflare・Google・GitHub）

Motteinai を自分の Cloudflare アカウントに公開するまでの手順です。プログラミングの知識がなくても、画面の指示どおりに進めれば終わるように書いています。

- 所要時間：30〜45分
- 費用：無料（R2 の有効化でクレジットカードの登録を求められますが、無料枠を超えない限り請求はありません。詳しくは [無料で動かせる範囲](#無料で動かせる範囲)）
- うまくいかないときは [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

> **秘密の値の扱い**：APIトークン・クライアントシークレットは、**GitHub の Secrets にだけ**貼り付けます。チャット・Issue・コミットには絶対に貼らないでください。アカウントID・データベースIDは秘密ではないので、見えても問題ありません。

---

## 全体の流れ

```
1. Cloudflare  ── APIトークン作成 → D1作成 → R2作成 → サブドメイン確認
2. GitHub      ── Secrets に Cloudflare の値を登録 → database_id を設定 → 公開
3. Google      ── OAuth の同意画面 → テストユーザー → クライアント作成
4. GitHub      ── Secrets に Google の値を登録 → 公開しなおす
5. スマホで確認
```

最終的に GitHub の Secrets に登録するのは次の4つです。

| 名前 | どこで手に入るか | 秘密か |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | 手順 1-1 | **秘密** |
| `CLOUDFLARE_ACCOUNT_ID` | 手順 1-2 | 秘密ではない |
| `GOOGLE_CLIENT_ID` | 手順 3-4 | 秘密ではないが、Secrets に入れる |
| `GOOGLE_CLIENT_SECRET` | 手順 3-4 | **秘密** |

---

## 0. 準備

- Cloudflare のアカウント（<https://dash.cloudflare.com/sign-up>。Google アカウントでも作れます）
- Google アカウント（Google Cloud Console を使います）
- GitHub に、このリポジトリ（またはフォーク）があること

---

## 1. Cloudflare

### 1-1. APIトークンを作る

GitHub Actions が Cloudflare へ自動で公開するための鍵です。

1. ダッシュボード左下の **Manage account → Account API tokens** を開く
   - 「My Profile → API Tokens（User API Tokens）」でも作れますが、**Account API tokens** を使ってください。あなた個人のログインと切り離された「機械用の鍵」になり、Cloudflare もこちらを推奨しています
2. **Create Token** を押す
3. テンプレート **Edit Cloudflare Workers** の **Use template** を押す
4. **Permission policies** に、**Add policy** で次の1行を足す
   - `Account` ／ `D1` ／ `Edit`（画面上は「D1 Write」と表示されます）
5. 最終的に、次の3つのポリシーが並んでいればOKです
   - All zones … Workers Routes Write
   - Entire account … Workers KV Storage Write, Workers Scripts Write, Account Settings Read ほか
   - Entire account … D1 Write
6. **Token expiration（有効期限）** を選ぶ
   - おすすめは **90 days** か **1 year**。期限が切れると自動公開が止まるので、**カレンダーに更新日を入れておく**（手順は [APIトークンの更新](#apiトークンの更新)）
7. **Continue to summary → Create Token**
8. 表示されたトークンを**その場で**コピーする（二度と表示されません）。手順 2-1 で GitHub に貼ります

### 1-2. アカウントIDを控える

ダッシュボードの URL の `dash.cloudflare.com/` の直後にある32文字の英数字がアカウントIDです。

```
https://dash.cloudflare.com/5be04228d09a39d680ab2a4065d42a6b/...
                            └──────── アカウントID ────────┘
```

**Workers & Pages** の画面右側「Account details」にも表示されています。

### 1-3. データベース（D1）を作る

1. 左メニュー **Storage & databases → D1 SQLite Database → Create**
2. 設定
   - **Name**：`motteinai`（この名前でないと動きません）
   - **Data location**：`Location`（自動）のまま。確実にしたいときは「Provide a location hint」で **Asia-Pacific**
   - **Specify jurisdiction**：選ばない（EUなどの法規制向けの設定）
3. **Create** を押す
4. 表示された **Database ID**（`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` の形）を控える。手順 2-2 で使います

### 1-4. 画像置き場（R2）を作る

1. 左メニュー **Storage & databases → R2 Object Storage**
2. 初回は **Add R2 subscription to my account** を押す
   - クレジットカードの登録を求められます。**今日の請求は $0**、月 10GB などの無料枠を超えたときだけ課金されます
3. **Create bucket**
   - **Bucket name**：`motteinai-images`（この名前でないと動きません。あとから変更できません）
   - **Location**：`Automatic`
   - **Default Storage Class**：**Standard**（無料枠は Standard のみ）
   - 公開設定は**変えない**（非公開のまま。画像はアプリ経由で本人にだけ見せます）
4. **Create bucket** を押す

### 1-5. サブドメインを確認する

公開URL `https://motteinai.<サブドメイン>.workers.dev` の `<サブドメイン>` 部分です。アカウントに1つだけで、このアカウントで作る全アプリで共通です。

1. 左メニュー **Compute → Workers & Pages**
2. 右側「Account details」の **Subdomain** を見る
   - 初めて開いたときに自動で作られ、Gmail アドレスの @ の前の部分になっていることがあります。**公開URLに出る**ので、気になるなら鉛筆アイコンから変更してください（小文字・数字・ハイフン）
3. 控えておく。この手順書では例として `ttk1010` を使います

---

## 2. GitHub（1回目）

### 2-1. Cloudflare の値を Secrets に登録する

1. リポジトリの **Settings → Secrets and variables → Actions** を開く
2. **New repository secret** で2つ登録する

| Name | Secret |
|---|---|
| `CLOUDFLARE_API_TOKEN` | 手順 1-1 のトークン |
| `CLOUDFLARE_ACCOUNT_ID` | 手順 1-2 のアカウントID |

### 2-2. database_id を設定して公開する

`wrangler.jsonc` の `database_id` を、手順 1-3 の Database ID に書き換えて `main` に push します。

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "motteinai",
    "database_id": "ここに Database ID",
    "migrations_dir": "migrations"
  }
],
```

push すると GitHub Actions（**Actions** タブの「CI / Deploy」）が動き、次を自動で行います。

1. Lint・型チェック・テスト・ビルド（`check`）
2. データベースのテーブル作成（`d1 migrations apply`）
3. Cloudflare への公開（`wrangler deploy`）
4. Google のシークレットを Worker へ反映（この時点では未登録なので、黄色い警告を出して飛ばします。手順 4 で解消）

`wrangler deploy` まで成功していれば、ログに `https://motteinai.<サブドメイン>.workers.dev` が表示されます。

---

## 3. Google（ログイン）

### 3-1. プロジェクトを作る

1. <https://console.cloud.google.com> を開く
2. 画面上部のプロジェクト選択 → **新しいプロジェクト**
3. プロジェクト名：`motteinai` → **作成**
4. 作ったプロジェクトが上部で選ばれていることを確認する

### 3-2. 同意画面（ブランディング）

1. 検索欄に「Google Auth Platform」と入れて開く（または **APIとサービス → OAuth 同意画面**）
2. **開始** を押して入力する
   - **アプリ名**：`Motteinai`（ログイン時に表示されます）
   - **ユーザーサポートメール**：自分の Gmail
   - **対象**：**外部**
   - **連絡先情報**：自分の Gmail
3. 規約に同意して **作成**
4. **アプリのロゴはアップロードしない**（ロゴを入れると Google の審査が必要になります）

### 3-3. 対象（テストユーザー）

最初は「テスト中」のまま使うのがおすすめです。追加した人（最大100人）だけがログインできます。

1. 左メニュー **対象**
2. **テストユーザー → ユーザーを追加** で、ログインに使う Gmail を追加する
   - 家族や友人にも使ってもらうなら、その人の Gmail もここに追加する

> 「アプリを公開」を押すと誰でもログインできるようになりますが、その前にブランディングページでホームページとプライバシーポリシーのURLを埋める必要があります。不特定多数に公開したくなったときの作業です。
>
> テスト中の「7日で期限切れ」の制限は Google のトークンの話で、Motteinai は自前で30日間ログインを保つので影響しません。

### 3-4. クライアントを作る

1. 左メニュー **クライアント → クライアントを作成**
2. 入力する（`ttk1010` は手順 1-5 の自分のサブドメインに置き換える）

| 項目 | 入力 |
|---|---|
| アプリケーションの種類 | **ウェブ アプリケーション** |
| 名前 | `Motteinai Web`（管理用。ログインする人には見えません） |
| 承認済みの JavaScript 生成元 | `https://motteinai.ttk1010.workers.dev`（**末尾に `/` を付けない**） |
| 承認済みのリダイレクト URI | `https://motteinai.ttk1010.workers.dev/auth/google/callback` |
| このクライアントを AI 搭載エージェントに使用する | **チェックしない** |

3. **作成** を押すと **クライアントID** と **クライアントシークレット** が表示される。両方コピーする
   - シークレットはこの画面を閉じると再表示できないことがあります。失くしたら同じ画面で新しいシークレットを追加できます

---

## 4. GitHub（2回目）

1. 手順 2-1 と同じ画面で、さらに2つ登録する

| Name | Secret |
|---|---|
| `GOOGLE_CLIENT_ID` | 手順 3-4 のクライアントID |
| `GOOGLE_CLIENT_SECRET` | 手順 3-4 のクライアントシークレット |

2. **Actions** タブ → 最新の「CI / Deploy」→ **Re-run all jobs**（または何かを `main` に push）
3. ログの「Sync Worker secrets」に `2 secrets successfully created` が出れば完了

> Google の値は Cloudflare のダッシュボードに直接登録しなくて大丈夫です。公開のたびに GitHub の Secrets から Worker へ自動で反映されます。**値を変えるときは GitHub 側だけ**を更新してください。

---

## 5. スマホで確認

1. `https://motteinai.<サブドメイン>.workers.dev` を開く
2. **Googleで続ける** → テストユーザーに追加した Gmail でログイン
3. 服を1着撮って登録する
4. 数秒後に確認する
   - 背景が切り抜かれているか（床やベッドに置いた服で試すと分かりやすい）
   - 「確認待ち」でカテゴリ・色・柄などのタグが入っているか
5. iPhone は Safari の共有ボタン → **ホーム画面に追加** でアプリのように使えます

---

## APIトークンの更新

期限が来る前に（目安1週間前）行います。期限が切れると、`main` に push しても公開が失敗します（アプリ自体は動き続けます）。

1. Cloudflare → **Manage account → Account API tokens**
2. 古いトークンの **⋯ → Roll**（同じ権限で作り直し）。または手順 1-1 と同じ手順で新規作成し、古いものは削除
3. GitHub の Secrets の `CLOUDFLARE_API_TOKEN` を **Update** で新しい値に置き換える
4. **Actions** の最新の実行を **Re-run all jobs** して、公開が通ることを確認する

## 無料で動かせる範囲

個人や少人数の利用なら無料枠に収まります。超えたときは、ほとんどの機能が「課金」ではなく「その機能が止まる」動きになり、アプリ側は止まらないように作ってあります。

| サービス | 無料枠 | 超えたら |
|---|---|---|
| Workers | 1日10万リクエスト | エラーになる |
| D1 | 5GB、1日500万行の読み込み | エラーになる |
| R2 | 月10GB、書き込み100万回、読み込み1000万回 | **課金される**（写真は1着1MB以下なので、1万着程度まで入る） |
| Workers AI | 1日1万 Neurons | タグ付けが止まり、確認待ちで手入力になる |
| Images（背景切り抜き） | 月5,000回 | 切り抜きなしで登録される（無料プランでは課金されない） |
| Open-Meteo（天気）・Google ログイン・GitHub Actions（公開リポジトリ） | 無料 | — |

Workers の有料プラン（月$5）は申し込まなくて大丈夫です。料金と無料枠は変わることがあるので、正確な値は [Cloudflare の料金ページ](https://www.cloudflare.com/plans/developer-platform/) を確認してください。
