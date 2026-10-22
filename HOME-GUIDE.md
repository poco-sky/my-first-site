# マイサイト：ホーム完成版

添付のAstroチュートリアルを元にしたホームです。Home / Profile / Fashion / Music / Blog のナビゲーション、スマートフォンの開閉メニュー、写真4枚のリンク、コピーライトを実装しています。プロフィール・服・音楽は準備中ページです。ブログの記事データとタグ機能は引き継いでいます。

## 起動
Node.js 22.22.0以上で、プロジェクトフォルダーをVS Codeで開き、`npm install`、`npm run dev`を実行してください。公開用ビルドは `npm run build` です。

## 写真や文章を変更する
- 写真：`public/images/profile.webp`、`fashion.webp`、`music.webp`、`blog.webp`
- 見出し・説明文・リンク先・代替テキスト：`src/data/home.ts`
- 写真の見せ方と余白：`src/styles/global.css`
- サイト名：`src/components/Header.astro`、`Footer.astro`、`src/layouts/BaseLayout.astro`
- ホームの構成：`src/pages/index.astro`
- ブログ本文：`src/blog/*.md`

写真を別の拡張子で用意する場合は、data/home.tsのimageも変更してください。現在の写真はすべてAI生成の仮ビジュアルで、本人・本人の作品の写真ではありません。

## 画像生成メモ
内蔵imagegenで4枚を生成し、WebPに圧縮しました。プロンプトの概要：海辺の道と淡い海（横長）、木の椅子とアイボリーのニット（縦長）、窓辺のレコードプレーヤー（縦長）、ノートとコーヒーのある木の机（横長）。共通指定：自然なフィルム調、落ち着いた色味、文字・ロゴ・人物なし。

## 引き継ぎ
チュートリアルのGreetingやThemeIconなどの未使用部品は残しています。白基調のホームでは使用していません。チュートリアル記事の内容はサンプルとして保持しています。公開先をNetlifyなどに変える場合はastro.config.mjsのsiteをそのURLに変更してください。
