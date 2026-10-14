# マイダッシュボード

自分専用のコントロールパネル。日付・時刻、天気、世界情勢ニュース、AI関連ニュース、Googleカレンダーの今日の予定を1画面で確認できる静的HTMLページです。

## 使い方

`index.html` をブラウザで開くだけで動作します（ビルド不要）。

```bash
python3 -m http.server 4321
# http://localhost:4321/index.html を開く
```

## 機能

- **日付・時刻**：現在時刻をリアルタイム表示
- **天気**：[Open-Meteo](https://open-meteo.com/) を利用（APIキー不要）。右上の「設定」から都市名を入力すると取得地点を設定できます
- **世界情勢**：BBC News World の RSS フィードを [rss2json](https://rss2json.com/) 経由で取得（APIキー不要）
- **AI関連ニュース**：[Hacker News (Algolia Search API)](https://hn.algolia.com/api) から「AI」関連の投稿を取得（APIキー不要）
- **Googleカレンダー**：今日の予定を一覧表示（要設定、下記参照）

## Googleカレンダー連携のセットアップ

このリポジトリは公開リポジトリのため、APIキーやクライアントIDはコードに直接書き込まず、各自のブラウザの `localStorage` に保存する方式にしています。

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを作成
2. 「APIとサービス」→「ライブラリ」から **Google Calendar API** を有効化
3. 「認証情報」から以下を発行
   - **OAuth クライアントID**（種類：ウェブアプリケーション）
     - 「承認済みの JavaScript 生成元」にこのページを配信するURL（例：`http://localhost:4321` や GitHub Pages の URL）を追加
   - **APIキー**
     - 「アプリケーションの制限」で HTTP リファラーを設定し、使用するURLに制限することを推奨
4. ページ右上の「⚙ 設定」を開き、発行したクライアントIDとAPIキーを入力して保存
5. 「Googleカレンダーに接続」ボタンから認証すると、今日の予定が表示されます

入力した値はブラウザの `localStorage` にのみ保存され、このリポジトリや他の端末には保存されません。

## ライセンス・注意事項

個人利用目的のツールです。外部APIはいずれも無料枠・無認証で利用できるものを選定していますが、利用規約・レートリミットは各サービスの提供元に従ってください。
