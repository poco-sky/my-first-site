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

## 白・黒のテーマ切り替え
ヘッダー左上の月／太陽ボタンで切り替えます。初回は白で、選んだテーマはブラウザーに保存されます。ボタンは`src/components/ThemeToggle.astro`、共通の配色は`src/styles/global.css`冒頭の変数、初期復元は`src/layouts/BaseLayout.astro`です。

## ホームの透明ヘッダー
ホームだけbodyに`home-page`クラスを付け、ヘッダーをabsoluteで写真の上に重ねています。スクロール固定ではありません。プロフィール写真の高さは100svh（最低540px）。ほかのページは通常のヘッダーです。global.css末尾の「ホーム：透明ヘッダー」以下で調整できます。

### 手元の編集済みプロジェクトに今回の変更だけを反映する
画像や文字を自分で変更済みの場合、ZIP全体を上書きせず次の2点を適用します。

1. src/layouts/BaseLayout.astro の `<body id="top">` を次に変更します。
```astro
<body id="top" class:list={{ 'home-page': home }}>
```
2. src/styles/global.css の末尾に次を追加します。
```css

/* ホーム：透明ヘッダーと画面いっぱいのプロフィール写真 */
.home-page .site-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  background: transparent;
  color: #fff;
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.35);
}
.home-page .wordmark span,
.home-page .menu-toggle {
  color: #fff;
}
.home-page .theme-toggle {
  background: transparent;
  border-color: rgba(255, 255, 255, 0.5);
  color: #fff;
}
.home-page .theme-toggle:hover {
  background: rgba(255, 255, 255, 0.12);
}
.home-page .home-gallery {
  padding: 0;
  max-width: none;
}
.home-page .profile {
  height: 100vh;
  height: 100svh;
  min-height: 540px;
  max-height: none;
}
/* 写真に淡い陰影を重ねて、白いナビゲーションを読みやすくする */
.home-page .profile::after {
  background: linear-gradient(180deg,
    rgba(9, 21, 25, 0.48) 0%,
    rgba(9, 21, 25, 0.12) 28%,
    rgba(9, 21, 25, 0.16) 50%,
    rgba(9, 21, 25, 0.52) 100%);
}
/* 下の写真には従来の左右余白を残す */
.home-page .paired-panels,
.home-page .blog {
  width: calc(100% - 56px);
  max-width: 1904px;
  margin-left: auto;
  margin-right: auto;
}
@media (min-width: 1600px) {
  .home-page .paired-panels,
  .home-page .blog { width: calc(100% - 96px); }
}
@media (max-width: 700px) {
  .home-page .site-header nav {
    color: var(--text);
    text-shadow: none;
  }
  .home-page .paired-panels,
  .home-page .blog { width: calc(100% - 24px); }
}

```

## ナビゲーションのみのスクロール固定
Header.astroでナビをnavigation-anchorで囲み、元の位置が画面上端に達するとis-pinnedクラスを付けています。サイト名とテーマボタンは通常どおりスクロールします。ホームは透明背景・白文字、それ以外は白黒テーマの背景です。スマートフォンでもスクロール後は5リンクを横並びで表示します。

手元の画像・文言などの編集を保って反映する場合：
- Header.astroを今回の版に置き換えます（サイト名を自分で変更していた場合はその文言を戻してください）。
- global.cssは全体を置き換えず、末尾の「スクロール後はナビゲーションだけを画面上部に固定」から下をコピーして追加します。
- Navigation.astro、home.ts、画像ファイルは変更不要です。
