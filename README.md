# マイダッシュボード

自分専用のコントロールパネル。日付・天気、TODOリスト、健康データ、世界情勢・AI関連ニュース、Googleカレンダーの今日の予定、Claudeが考える改善アイデアを1画面で確認できる静的HTMLページです。

## 使い方

`index.html` をブラウザで開くだけで動作します（ビルド不要）。

```bash
python3 -m http.server 4321
# http://localhost:4321/index.html を開く
```

## 機能

- **日付・天気**：現在の日付・曜日と、現在地（位置情報）または登録したプリセット地点の天気を1枚のカードで表示。[Open-Meteo](https://open-meteo.com/)（APIキー不要）を利用し、取得に失敗した場合は再試行ボタンを表示
- **TODOリスト**：期限・優先度（高・中・低）付きでタスクを管理。期限が近い順（同じ期限内は優先度順）に並び、チェックを入れると完了として一覧から消える。インライン編集に対応
- **健康データ**：iPhoneのヘルスケアデータ（歩数・距離・アクティブエネルギー・睡眠時間・心拍数・体重）を、ショートカットアプリ経由でGoogleスプレッドシートに自動送信し、ダッシュボードから読み込んで表示（要設定、下記参照）
- **世界情勢・AI関連ニュース**：Googleニュースのフィードを [rss2json](https://rss2json.com/) 経由で取得（アカウント登録不要）。30分おきに自動更新し、失敗時は再試行ボタンを表示
- **Googleカレンダー**：今日の予定を一覧表示（要設定、下記参照）。認証トークンをキャッシュし、有効期限内（約1時間）は再承認なしで自動表示
- **改善アイデア**：Claudeが毎日チェックし、アクティブなアイデアが5件未満なら不足分を考えて `ideas.json` に追記する仕組み

## Google連携（カレンダー・健康データ）のセットアップ

このリポジトリは公開リポジトリのため、APIキーやクライアントIDはコードに直接書き込まず、各自のブラウザの `localStorage` に保存する方式にしています。カレンダーと健康データ（スプレッドシート）は同じGoogle認証を共有します。

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを作成
2. 「APIとサービス」→「ライブラリ」から **Google Calendar API** と **Google Sheets API** の両方を有効化
3. 「認証情報」から以下を発行
   - **OAuth クライアントID**（種類：ウェブアプリケーション）
     - 「承認済みの JavaScript 生成元」にこのページを配信するURL（例：`http://localhost:4321` や GitHub Pages の URL）を追加
   - **APIキー**
     - 「アプリケーションの制限」で HTTP リファラーを設定し、使用するURLに制限することを推奨
     - 「APIの制限」で Calendar API・Sheets API に制限することを推奨
4. ページ右上の「⚙ 設定」を開き、発行したクライアントIDとAPIキーを入力して保存
5. 「Googleカレンダーに接続」ボタンから認証すると、今日の予定が表示されます（カレンダー・健康データ用のスコープを1回でまとめて承認します）

入力した値はブラウザの `localStorage` にのみ保存され、このリポジトリや他の端末には保存されません。

## 健康データ連携のセットアップ（iPhone）

ヘルスケアアプリには外部サイトから直接読み取れる公開APIがないため、「iPhoneショートカット → Googleスプレッドシート → ダッシュボード」という経路でデータを連携します。スプレッドシートは非公開のままでよく、ダッシュボードは上記のGoogle認証（本人のログイン時のみ）で読み込みます。

### 1. スプレッドシートを用意する

1. Googleスプレッドシートを新規作成（非公開のままでOK、誰とも共有しない）
2. シート（タブ）名を `HealthData` にする
3. 1行目に見出しを入れる：`日付, 歩数, 距離km, アクティブエネルギーkcal, 睡眠時間h, 心拍数bpm, 体重kg`
4. URL（`https://docs.google.com/spreadsheets/d/【この部分】/edit`）からスプレッドシートIDをコピーし、ダッシュボードの「⚙ 設定」→「健康データ用 Google スプレッドシートID」に貼り付けて保存

### 2. Google Apps Script を設定する（書き込み用の受け口）

iPhoneのショートカットはGoogleへのOAuth認証ができないため、共有トークン（自分で決めるパスワードのようなもの）で保護したWebアプリ経由で書き込みます。

1. スプレッドシートのメニューから「拡張機能」→「Apps Script」を開く
2. 以下のコードを貼り付け、`YOUR_SECRET_HERE` を自分で決めた秘密の文字列に置き換える（他人に推測されない文字列にしてください）

```javascript
function doPost(e) {
  var SECRET = 'YOUR_SECRET_HERE'; // ショートカット側と同じ値にする
  var sheetName = 'HealthData';

  try {
    var data = JSON.parse(e.postData.contents);
    if (data.secret !== SECRET) {
      return ContentService.createTextOutput(JSON.stringify({ error: 'unauthorized' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) {
      sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(sheetName);
      sheet.appendRow(['日付', '歩数', '距離km', 'アクティブエネルギーkcal', '睡眠時間h', '心拍数bpm', '体重kg']);
    }

    sheet.appendRow([
      data.date || Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd'),
      data.steps || '',
      data.distance || '',
      data.activeEnergy || '',
      data.sleepHours || '',
      data.heartRate || '',
      data.weight || ''
    ]);

    return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

3. 「デプロイ」→「新しいデプロイ」→種類「ウェブアプリ」を選択
   - 「次のユーザーとして実行」：**自分**
   - 「アクセスできるユーザー」：**全員**（ショートカットがGoogleログインなしで呼び出すために必要。中身は共有トークンで保護されているので、トークンを知らない第三者は書き込めません）
4. デプロイ後に表示される **ウェブアプリのURL** をコピーしておく（iPhone側の設定で使います）

### 3. iPhoneのショートカットを設定する

1. 「ショートカット」アプリで新規ショートカットを作成
2. ヘルスケアの値を取得するアクションを追加（例）
   - 「ヘルスケアサンプルを検索」→ 歩数（当日分の合計）
   - 「ヘルスケアサンプルを検索」→ ウォーキング＋ランニング距離（当日分の合計）
   - 「ヘルスケアサンプルを検索」→ アクティブエネルギー（当日分の合計）
   - 「ヘルスケアサンプルを検索」→ 睡眠分析（直近の睡眠時間）
   - 「ヘルスケアサンプルを検索」→ 心拍数（直近の値、または当日の平均）
   - 「ヘルスケアサンプルを検索」→ 体重（直近の値）
3. 「辞書を取得」またはテキストアクションで、以下のキーを持つJSONを組み立てる
   ```json
   {
     "secret": "YOUR_SECRET_HERE",
     "date": "今日の日付（YYYY-MM-DD）",
     "steps": "歩数",
     "distance": "距離(km)",
     "activeEnergy": "アクティブエネルギー(kcal)",
     "sleepHours": "睡眠時間(時間)",
     "heartRate": "心拍数(bpm)",
     "weight": "体重(kg)"
   }
   ```
4. 「URLの内容を取得」アクションを追加
   - URL：手順2でコピーしたApps ScriptのウェブアプリURL
   - メソッド：POST
   - リクエスト本文：JSON（手順3の辞書を指定）
5. このショートカットを「オートメーション」タブで「時刻」トリガーの個人用オートメーションとして登録し、「実行前に確認」をオフにして毎日自動実行されるようにする（例：毎晩23時）

これで翌朝ダッシュボードを開くと、前日分の健康データが表示されます。

## ライセンス・注意事項

個人利用目的のツールです。外部APIはいずれも無料枠・無認証（またはGoogleの個人認証のみ）で利用できるものを選定していますが、利用規約・レートリミットは各サービスの提供元に従ってください。健康データは機微な個人情報です。スプレッドシートは第三者と共有しない設定のまま保つことを推奨します。
