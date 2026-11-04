# 01. 既存アプリ調査

調査日: 2026-11-04
方法: Web検索（各社ストア掲載情報、比較記事、レビュー記事、ユーザー投稿）。
制約: この環境では一部サイトへの直接アクセスが遮断されていたため、多くは検索結果の要約に基づく。各社比較記事の多くは競合アプリ自身が書いたもので、数値（離脱率・削減率など）はマーケティング上の主張として扱う。

---

## 1. 調査対象

| アプリ | 地域 | 登録方式 | コーデ提案 | 買い物支援 | 料金 |
|---|---|---|---|---|---|
| **Whering** | 英・グローバル | 写真＋背景除去、ECからスクショ取込（ユーザーの回避策） | あり（簡易と評される）、カレンダー、旅行パッキング | 「購入前に手持ちとの合わせを確認」、色の偏り/ギャップ表示、提携300+ブランドへの送客 | 無料＋課金（Outfit Maker、クレジット） |
| **Indyx** | 米 | 写真、専任スタッフによる代行デジタル化（有料） | 軽め。人間スタイリストが主 | 有料Insider：構成・着用・支出の分析ダッシュボード | 無料＋月額（$6.99〜12.99と情報が割れる） |
| **Acloset** | 韓・グローバル | 写真＋自動背景除去＋AIタグ（カテゴリ/色/素材） | AIコーデ生成 | 購入日・価格・着用単価の記録 | 100着まで無料、超過は課金 |
| **Stylebook** | 米 | 手動（意図的に手作業前提） | 手動作成 | 統計 | 買い切り（$4.99前後）、iOS/Macのみ |
| **Alta** | 米 | 写真、**Eレシート転送**、**商品DB照合** | AIスタイリスト（チャット型） | アバター試着、購入提案 | 無料＋課金 |
| **XZ（クローゼット）** | 日 | **撮影不要：用意された服から似たものを選ぶ** | ユーザー投稿コーデ参照 | — | 基本無料＋月額約200円 |
| **JUSCLO** | 日 | 1着ずつ撮影 | コーデ記録 | — | — |
| **CLOSTO** | 日 | 写真 | カレンダー記録 | — | 削除機能がない・データが増えると重いとの不満 |
| **マイクローゼット** | 日 | **写真なし。種類ごとの枚数だけ管理** | なし | 所有数の把握 | 有料（約$2.99） |
| **StyleHint（ユニクロ/GU）** | 日 | 手持ち服を撮ると類似商品・着こなしを表示 | 他人の着こなし | 自社EC送客 | 無料 |

## 2. 横断して見えたこと

### 2.1 登録：全アプリ共通の最大の壁
- 「1着30〜60秒 × 100着 = 2時間の作業」になり、ここで離脱する。比較記事・報道・ユーザー投稿のどれもが同じ問題を挙げている（「全部をデジタル化するのはとても時間がかかる」「撮影に何時間かけたか分からない」）。
- 各社の対策は、手間の減らし方で4つに分かれる。
  1. **写真の自動処理**（Acloset、Whering、Alta）：背景除去とAIタグで入力を減らす。ただし撮影は1着ずつ。
  2. **写真をやめる**（XZのカタログ選択、マイクローゼットの数量管理）：手軽だが、見た目の似ている度合いや合わせやすさは判定できない。
  3. **外部データ**（Altaのレシート、商品DB）：新しく買う服には強いが、すでに持っている服には効かない。
  4. **人に任せる**（Indyxの代行）：高コストでスケールしない。
- **登録作業と、価値（コーデ提案）を得るまでの距離**が長い。数十着入れて初めて提案が意味を持つので、途中で心が折れる。

### 2.2 コーデ提案：「今日何を着るか」に偏る
- ほぼ全アプリの中心は「家で今日の服を決める」。
- 「使い回しやすい服ばかり提案される」という不満がある。出番のない服は放置されたまま。

### 2.3 買い物支援：利益相反と、使う場面のずれ
- Wheringの買い物機能は提携ブランドへの送客モデルで、「買わない方がいい」とは言いにくい構造。StyleHintも自社商品への誘導が目的。
- 「購入前の確認」機能はあっても、**店頭で数秒で答えが出る作り**になっていない。アプリを開いてカテゴリを探して…という手順を踏む必要がある。
- 「持っていない色と形を把握してから買い物に行く」「同じような服をすでに持っていないか確認」は買い物指南記事の定番アドバイスだが、それを自動でやってくれるものはない。
- 「何を買えば手持ちが活きるか」を**組み合わせが何通り増えるか**で示すアプリは見当たらなかった。

### 2.4 その他
- 記録を続けたユーザーは「記録がないと忘れて後悔する買い物が増える」と価値を実感している。つまり**データが溜まれば価値はある**。問題は溜まるまでの手間。
- データの書き出しができない、削除できない、重くなるなど、基本的な部分の不満もある。

## 3. 差別化の機会（ここから設計に使う）

| # | 機会 | 根拠 |
|---|---|---|
| O1 | **店頭での購入判断を中心機能にする** | 既存アプリは家での使用が中心。ユーザーの困りごとは「店で迷う」こと |
| O2 | **買い物チェックが、そのまま登録になる** | 新しく増える服は、チェック時に撮った写真で登録完了にできる。Altaのレシートより自然 |
| O3 | **連続撮影と後回しの確認で、1着3秒** | 写真の自動処理（Acloset型）と、確認作業を後に回す設計の組み合わせ |
| O4 | **「＋N通り」で価値を数字にする** | 組み合わせの数で、買う価値・持っている価値を見せる |
| O5 | **出番のない服を活かす提案** | 使い回しやすい服ばかり提案されるという不満への対応 |
| O6 | **売り込みをしない** | 送客モデルにしないので、「買わない」と言える |
| O7 | **10着で最初の価値が出る** | 登録と価値のあいだの距離を縮める |

## 4. 出典

- [The best wardrobe apps in 2026 - Aura](https://www.auraapp.fr/en/blog/meilleures-applications-garde-robe-2026)
- [Best Outfit Planning Apps 2026 - clueless.clothing](https://clueless.clothing/blog/best-outfit-planning-apps-comparison-2026/)
- [8 Best Digital Wardrobe Apps 2026 - Modebase](https://www.modebase.co/journal/best-digital-wardrobe-apps-2026)
- [Whering vs Alta vs Acloset - FITPOP](https://fitpop.ai/guides/digital-wardrobe-apps-compared/)
- [10 Wardrobe Apps Compared: 2026 Feature Chart](https://wardrowbe.com/blog/wardrobe-app-comparison-chart-2026/)
- [Best Wardrobe Apps 2026 - Nouva](https://www.nouva.app/blog/best-wardrobe-apps-2026-comparison)
- [Wardrobe apps that actually work (review)](https://swagwise-content-hub.vercel.app/blog/wardrobe-apps-that-actually-work-tested-review)
- [Can you really organize your closet with an app? - Boston 25 News](https://www.boston25news.com/news/can-you-really/SAF5WKSDZI3OTFHMH74AFBUQUY/)
- [i tracked everything i wore in 2025](https://whitep4nth3r.com/blog/i-tracked-everything-i-wore-in-2025/)
- [What would make you keep using a wardrobe app? - Product Hunt](https://www.producthunt.com/p/indutus/what-would-make-you-keep-using-a-wardrobe-app)
- [r/femalefashionadvice: which wardrobe app in 2025](https://red.chatoyer.de/r/femalefashionadvice/comments/1jjtgyt/the_perennial_question_which_wardrobe_app_in_2025)
- [Whering vs. Indyx - Indyx](https://myindyx.com/versus/whering-vs-indyx)
- [Meet Indyx - Inside Retail](https://insideretail.asia/2024/04/22/meet-indyx-the-personal-style-app-that-is-solving-fashion-sustainability-issue/)
- [Whering - App Store](https://apps.apple.com/gb/app/id1519461680)
- [Acloset - screensdesign](https://screensdesign.com/showcase/acloset-ai-fashion-assistant) / [Acloset Support](https://www.acloset.app/support/)
- [What Users Are Saying About Alta](https://www.altadaily.com/blog/user-reviews) / [Reflections From My Clueless Closet](https://technocouture.substack.com/p/reflections-from-my-clueless-closet)
- [XZ vs JUSCLO - Appllio](https://appllio.com/closet-app-xz-vs-jusclo)
- [CLOSTO - App Store](https://apps.apple.com/jp/app/closto-%E6%B4%8B%E6%9C%8D%E7%AE%A1%E7%90%86-%E3%82%B3%E3%83%BC%E3%83%87%E3%82%A3%E3%83%8D%E3%83%BC%E3%83%88%E7%AE%A1%E7%90%86%E3%81%AE%E3%82%AF%E3%83%AD%E3%82%B9%E3%83%88/id6504729286)
- [マイクローゼット - App Store](https://apps.apple.com/hn/app/%E3%83%9E%E3%82%A4%E3%82%AF%E3%83%AD%E3%83%BC%E3%82%BC%E3%83%83%E3%83%88-%E6%9C%8D%E3%81%AE%E7%AE%A1%E7%90%86%E3%82%A2%E3%83%97%E3%83%AA/id6651831997)
- [StyleHint プレスリリース - ユニクロ](https://www.uniqlo.com/jp/corp/pressrelease/2019/08/19082015_stylehint.html)
- 買い物失敗の原因: [東洋経済](https://toyokeizai.net/articles/-/507830?display=b) / [kinarino](https://kinarino.jp/cat1/20766) / [ダイヤモンド](https://diamond.jp/articles/-/228934) / [プレジデント](https://president.jp/articles/-/31315)
