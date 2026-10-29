# 曲を1曲ずつMarkdownで管理する

## 適用前
前回のMUSICページと並び替え更新を適用済みのサイト用です。
現在の src/data/music.ts をプロジェクト外にコピーして保存してください。
こちらで確認できる曲はTonightのみです。追加済みの曲・編集済み歌詞は、旧music.tsから各mdファイルへ移してください。

## 適用
ZIPのsrc内のファイルを、既存プロジェクトの同じ場所へコピーします。
srcフォルダ全体は削除しないでください。
開発サーバーをCtrl+Cで止め、npm run devで再起動し、ブラウザを再読み込みしてください。
CSSは同梱していないため歌詞パネルの幅は変わりません。
デフォルトの並び順は新しい順です。
content.config.tsに独自の変更があれば、既存の設定を保持し、musicの定義とcollectionsへのmusicの登録を追加してください。

## 曲を追加する
1. src/music/_template.md を複製し、my-song.mdなど別の名前にする。
2. 上部のtitle（曲名）、artist、genre、addedAt（追加日）、audio、coverを記入する。
3. 最後の---の下に英語歌詞を書く。
4. <!-- translation --> の下に日本語訳を書く。この区切りは単独の行に1つだけ置く。
5. MP3をpublic/music/、ジャケットをpublic/images/music/へ入れる。

ファイル名は半角英数字とハイフンを推奨します。ファイル名が曲のIDになります。
_template.mdなど先頭が_のファイルは一覧に出ません。
src/data/music.tsは自動読み込みの処理なので、曲追加時に編集する必要はありません。削除もしないでください。

## 新旧の順序
addedAtの日時で判定します。例：addedAt: '2026-10-30'
同じ日の曲にも順番をつけたい場合：addedAt: '2026-10-30T18:30:00+09:00'
同日時の場合はファイル名順を基準にします。
Tonightの追加日は仮に2026-10-29にしています。好きな日付へ変更できます。

## 歌詞の仕様
改行・空行は表示に反映されます。本文はプレーンテキストとして表示するため、Markdownの太字や画像は装飾として解釈されません。
歌詞が未定なら本文を空欄にできます。未入力時は「歌詞は準備中です。」と表示します。
genreをInstrumentalにし本文を空欄にすると「この曲はInstrumentalです。」と表示します。

## 既存の曲の移行
旧music.tsの1曲ごとにテンプレートを複製します。
旧idと同じ名前のmdファイルを作り、title/artist/genre/audio/coverをコピーします。
旧lyricsを本文の前半、translationを区切りの後半へコピーします。
旧文字列内の\nは実際の改行に置き換え、文字列を囲むバッククォートはコピーしません。
曲数と歌詞を確認してからバックアップを片付けてください。

## 変更ファイル
src/content.config.ts
src/data/music.ts
src/components/MusicPlayer.astro
src/scripts/music-player.ts
src/pages/music.astro
新規：src/music/tonight.md、src/music/_template.md

## 確認
ビルド成功。Music/Blog/記事の生成HTMLに同じ曲情報が入り、歌詞2種類が分割され、テンプレートが除外されることを確認しました。
今回の変更後のブラウザ再生テストは未実施です。
