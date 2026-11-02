# Fashionページ導入・編集ガイド

## 導入

1. 現在のプロジェクトをバックアップしてください。
2. このZIP内の `src` と `public` を、現在のプロジェクトの同名フォルダーに**結合してコピー**してください。フォルダー全体を削除して入れ替えないでください。
3. 同名ファイルの上書きは、今回送っていただいた `my-first-site (3).zip` を基にしています。その後編集した場合は差分を確認してください。
4. `npm run dev` を実行し `/fashion/` を開きます。追加パッケージは不要です。

音楽ファイルはこのZIPに入っていません。元のプロジェクトの音楽ファイルを残してください。

## 今回の状態

ページの構造と動作を実装しました。ブランド名は BRAND NAME、コンセプトは仮文、ヒーローは既存の `/images/fashion.png` です。個別の服・着用写真はアップロードに無かったため、画像枠と3着のサンプルを用意しています。写真枠は本物の服ではありません。

- Fashionトップ：画面いっぱいのヒーロー、ホームと同じ透明ヘッダー、ブランド紹介、3枚固定のPICK UP、3列のITEM。
- スマートフォンもPICK UP・ITEMは指定どおり3列です。詳細ギャラリーは1枚を大きく見せて次の画像が少し覗く幅です。
- 各服ページ：3:4の画像をPCでは約1/3幅で横スクロール。`object-fit: contain` で画像を切り取りません。タッチ、横スクロール操作、ギャラリーにフォーカスして左右キーで操作できます。
- ALLとカテゴリの絞り込み。カテゴリはMarkdownから自動生成します。
- 既存のテーマ切替・音楽プレイヤー・通知・SNSは共通レイアウトを利用します。

## ブランド名・コンセプト・ヒーロー

`src/data/fashion.ts` を編集します。

- `name`：ブランド名
- `concept`：コンセプト文
- `hero`：ロゴ入りメイン画像のパス
- `heroAlt`：画像の説明
- `heroPosition`：ヒーローの切り取り位置（例 `center` / `center 40%`）

ヒーローは画面を埋めるため `cover`。端まで必ず見せる詳細写真とは異なり、画面比率によって周辺が切れます。

## 1着＝1つのMarkdown

`src/fashion/sweat-01.md` などを編集します。追加するときはコピーして、半角英数字の別名にしてください。`sweat-04.md` は `/fashion/sweat-04/` になります。

- `title`：服のタイトル
- `description`：短い説明
- `category`：種類（今はスウェット）
- `order`：ITEMの順番。小さいほど先頭
- `cover` / `coverAlt`：ITEM一覧の写真と説明
- `pickup.image` / `pickup.alt`：PICK UP用の着用写真と説明
- `pickup.title`：写真の上に重ねる文字
- `pickup.order`：PICK UPの順番。小さい順に最大3着
- `images`：詳細ページの写真リスト。商品写真1枚→着用写真4枚以上の順で設定
- 最後の `---` より下：詳しい説明。通常のMarkdownが使えます

PICK UPに出さない服は `pickup:` とその下の4項目を削除します。3枠を埋めるには3着にpickupを設定してください。4着以上設定した場合はorderの小さい3着だけ表示します。

写真は `public/images/fashion/` に置き、Markdownでは `/images/fashion/ファイル名.jpg` と書きます。現在、詳細の着用写真4枚は同じ仮画像を参照しています。1枚ずつ別の写真のパスに変更してください。

例：

```yaml
images:
  - src: "/images/fashion/black-front.jpg"
    alt: "ブラックスウェットの正面"
  - src: "/images/fashion/black-look-01.jpg"
    alt: "正面からの着用写真"
  - src: "/images/fashion/black-look-02.jpg"
    alt: "横からの着用写真"
  - src: "/images/fashion/black-look-03.jpg"
    alt: "背面の着用写真"
  - src: "/images/fashion/black-look-04.jpg"
    alt: "デザインのアップ"
```

## 見た目の微調整

`src/styles/fashion.css`：

- `.fashion-brand`：ブランド紹介の上下余白
- `.fashion-brand h1`：ブランド名の大きさ・太さ
- `.fashion-pickups`：3枚の間隔
- `.fashion-pickup::after`：枠線・角丸
- `.fashion-pickup-copy`：写真上の文字位置
- `.fashion-grid`：ITEMの列数と間隔
- `.fashion-gallery figure`：詳細写真の横幅
- `@media(max-width:700px)`：スマートフォンの調整

## 変更ファイル

- `src/content.config.ts`
- `src/data/fashion.ts`
- `src/fashion/sweat-02.md`
- `src/fashion/sweat-03.md`
- `src/fashion/sweat-01.md`
- `src/layouts/BaseLayout.astro`
- `src/pages/fashion.astro`
- `src/styles/fashion.css`
- `src/pages/fashion/[id].astro`
- `public/images/fashion/sample-1-item.svg`
- `public/images/fashion/sample-1-look.svg`
- `public/images/fashion/sample-2-item.svg`
- `public/images/fashion/sample-3-look.svg`
- `public/images/fashion/sample-3-item.svg`
- `public/images/fashion/sample-2-look.svg`

既存ファイルの変更は `src/pages/fashion.astro`、`src/layouts/BaseLayout.astro`、`src/content.config.ts` の3つ。それ以外は新規追加です。
BaseLayoutにはFashion専用フラグを追加し、既存のホーム用透明ヘッダーを再利用。Music・Blogなどの既存表示条件は維持しています。

## 確認

- `npm ci` と `npm run build` 成功（全19ページ生成）
- Fashion4ページのh1、画像参照、詳細リンク、PICK UP3枚、詳細各5枚の生成を確認
- ブラウザーでの実機表示・タップ・曲の再生継続は未検証です。ご自身の環境で確認してください。
