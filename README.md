# HTMLツール集

個人用HTMLツールをまとめた静的サイトです。ビルド工程は不要で、GitHub Pagesなどの静的ホスティングにそのまま配置できます。

## フォルダー構成

```text
index.html                         # ツール一覧・GitHub Pagesの入口
予定作成ツールフォルダ/
├─ 予定作成ツール.html
├─ css/style.css
└─ js/app.js
費用集計ツール/
├─ 費用集計ツール.html
├─ css/style.css
└─ js/app.js
単価比較計算ツール/
├─ 単価比較計算ツール.html
├─ css/style.css
└─ js/app.js
物件比較用マップツール/
├─ 物件比較用マップツール.html
├─ css/style.css
└─ js/
   ├─ app.js
   └─ backup.js
README.md
```
各ツールのHTMLに埋め込まれていた主要なCSSとJavaScriptは別ファイルに分けています。動作に必要な一部の動的な`style`属性は、挙動を変えないためHTML内に残しています。物件マップの地図ライブラリ等は外部サービスを利用します。
