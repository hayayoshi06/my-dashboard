# マイダッシュボード

自分専用のコントロールパネル。日付・天気、TODOリスト、健康データ、世界情勢・AI関連ニュース、Googleカレンダーの今日の予定、Claudeが考える改善アイデアを1画面で確認できる静的HTMLページです。

## 使い方

`index.html` をブラウザで開くだけで動作します（ビルド不要）。

```bash
python3 -m http.server 4321
# http://localhost:4321/index.html を開く
```

## 機能

- **日付・天気**：現在の日付・曜日と、現在地（位置情報）または登録したプリセット地点の天気（気温・体感温度・降水確率など）を1枚のカードで表示。[Open-Meteo](https://open-meteo.com/)（APIキー不要）を利用し、取得に失敗した場合は再試行ボタンを表示
- **TODOリスト**：期限・優先度（高・中・低）・カテゴリ（プライベート／仕事）付きでタスクを管理。カテゴリごとにグループ分けし、各グループ内は期限が近い順（同じ期限内は優先度順）に並ぶ。チェックを入れると一覧からは外れるが、3日間は「最近完了」として折りたたみ表示され、チェックを外せば復元できる。インライン編集に対応
- **健康データ**：iPhoneのヘルスケアデータ（歩数・距離・アクティブエネルギー・睡眠時間・心拍数・体重）を、ショートカットアプリ経由でGoogleスプレッドシートに自動送信し、ダッシュボードから読み込んで表示（要設定、下記参照）
- **世界情勢・AI関連ニュース**：Googleニュースのフィードを、Apps Script経由で取得（要設定、下記参照）。30分おきに自動更新し、失敗時は再試行ボタンを表示
- **Googleカレンダー**：今日の予定を一覧表示（要設定、下記参照）。認証トークンをキャッシュし、有効期限内（約1時間）は再承認なしで自動表示
- **今日のタイムライン**：Googleカレンダーの今日の予定と、今日期限のTODOを時系列で1つのカードにまとめて表示。時刻指定の予定が今後にあれば「次の予定まであと◯分」というカウントダウンを先頭に表示（1分ごとに自動更新、対象は当日中の予定のみ）
- **クイックメモ**：買い物リストなど、構造化しないちょっとしたメモを自由に書ける欄。入力するたびに自動保存される。1行ずつ「→TODO」ボタンでワンタップでTODOリストに変換できる
- **TODO・メモの端末間同期**：Googleに接続していれば、TODOリストとクイックメモを健康データ用スプレッドシート内の「AppSync」タブ経由で自動同期する。iPhone・Macなど複数端末から同じ内容を見られる（要Google連携、下記参照）
- **音声アシスタント「アトラス」との連携**：Macで動く音声アシスタント（同じ親フォルダの `../atlas`）から、今日の予定・TODO・健康データを読み上げたり、TODOを追加・完了したりできる（要設定、下記参照）
- **改善アイデア**：Claudeが毎日チェックし、アクティブなアイデアが5件未満なら不足分を考えて `ideas.json` に追記する仕組み。実装して完了にしたアイデアは、完了日（`completedDate`）から7日間だけ「完了済み」として折りたたみ表示で振り返れる

## ホーム画面に追加する（PWA）

`manifest.json` と `service-worker.js` に対応しているため、iPhoneのSafariで「共有」→「ホーム画面に追加」すると、アプリのようにアイコンから起動できます（ブラウザのアドレスバーなしで開きます）。

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
5. 「Googleカレンダーに接続」ボタンから認証すると、今日の予定が表示されます（カレンダー・健康データ・TODO同期用のスコープを1回でまとめて承認します）

入力した値はブラウザの `localStorage` にのみ保存され、このリポジトリや他の端末には保存されません。

TODO・クイックメモの同期にはスプレッドシートへの書き込み権限が必要なため、以前のバージョンで既に接続していた場合は、一度「設定」から再接続（再認証）してください。

## 健康データ連携・ニュース取得のセットアップ（Apps Script）

ヘルスケアアプリには外部サイトから直接読み取れる公開APIがないため、「iPhoneショートカット → Googleスプレッドシート → ダッシュボード」という経路でデータを連携します。スプレッドシートは非公開のままでよく、ダッシュボードは上記のGoogle認証（本人のログイン時のみ）で読み込みます。

同じApps Scriptに、ニュース取得用の `doGet` 関数も追加して使い回します（下記手順2の3番目）。健康データ連携を使わず、ニュース取得だけ直したい場合も、このApps Scriptの作成は必要です。

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
    // アトラスはトークンを atlasSecret で送る。このコードに更新する前の古いスクリプトでは
    // 認証エラーになるので、アトラスの呼び出しが誤って健康データの行として書き込まれることがない
    if ((data.action ? data.atlasSecret : data.secret) !== SECRET) {
      return ContentService.createTextOutput(JSON.stringify({ error: 'unauthorized' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    if (data.action) return handleAtlas(data); // 音声アシスタント「アトラス」からの呼び出し（下記）

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) {
      sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(sheetName);
      sheet.appendRow(['日付', '歩数', '距離km', 'アクティブエネルギーkcal', '睡眠時間h', '心拍数bpm', '体重kg']);
    }

    var dateStr = data.date || Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd');
    var rowValues = [
      dateStr,
      data.steps || '',
      data.distance || '',
      data.activeEnergy || '',
      data.sleepHours || '',
      data.heartRate || '',
      data.weight || ''
    ];

    // 同じ日付の行が既にあれば上書きし、無ければ新規に追加する（同日に複数回実行しても重複しない）
    var lastRow = sheet.getLastRow();
    var existingRowIndex = -1;
    if (lastRow > 1) {
      var dateColumn = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (var i = 0; i < dateColumn.length; i++) {
        var cellValue = dateColumn[i][0];
        // instanceof Date はスプレッドシートの日付値では false になることがあるため、
        // Object.prototype.toString で判定する
        var isDateObj = Object.prototype.toString.call(cellValue) === '[object Date]';
        var existingDateStr = isDateObj
          ? Utilities.formatDate(cellValue, 'Asia/Tokyo', 'yyyy-MM-dd')
          : String(cellValue);
        if (existingDateStr === dateStr) {
          existingRowIndex = i + 2; // 1行目はヘッダーなので+2
          break;
        }
      }
    }

    if (existingRowIndex > 0) {
      sheet.getRange(existingRowIndex, 1, 1, rowValues.length).setValues([rowValues]);
    } else {
      sheet.appendRow(rowValues);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

3. 同じスクリプトに、ニュース取得用の `doGet` 関数も追加する（ダッシュボードのニュース取得で使う。rss2jsonなど無料の中継サービスがGoogleニュースへのアクセスを不正利用とみなしてブロックすることが多く不安定なため、サーバー側のApps Script経由で取得する方式にしている）

```javascript
function doGet(e) {
  try {
    var feed = (e.parameter.feed || 'world');
    var rssUrl = feed === 'ai'
      ? 'https://news.google.com/rss/search?q=AI&hl=ja&gl=JP&ceid=JP:ja'
      : 'https://news.google.com/rss/headlines/section/topic/WORLD?hl=ja&gl=JP&ceid=JP:ja';
    var res = UrlFetchApp.fetch(rssUrl, { muteHttpExceptions: true });
    return ContentService.createTextOutput(res.getContentText()).setMimeType(ContentService.MimeType.XML);
  } catch (err) {
    return ContentService.createTextOutput('<error>' + err.message + '</error>').setMimeType(ContentService.MimeType.XML);
  }
}
```

4. （音声アシスタント「アトラス」を使う場合のみ）同じスクリプトに、以下のアトラス用の関数も追加する。アトラスに今日の予定・TODO・健康データを渡し、アトラスからのTODOの追加・完了を受け付ける。詳しくは下記「音声アシスタント「アトラス」との連携」を参照

```javascript
// ========== 音声アシスタント「アトラス」用 ==========
// アトラスはTODO本体（AppSyncタブ）を直接書き換えず、AtlasInboxタブに操作を1行ずつ積む。
// ダッシュボードが開かれた時にその操作を本体へ反映し、受け箱を空にする
var ATLAS_INBOX_SHEET = 'AtlasInbox';
var ATLAS_TZ = 'Asia/Tokyo';

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function handleAtlas(data) {
  if (data.action === 'context') return jsonOut(atlasContext());

  var op;
  if (data.action === 'addTodo') {
    var text = String(data.text || '').trim().slice(0, 200);
    if (!text) return jsonOut({ error: 'empty text' });
    op = { type: 'add', id: Date.now(), text: text, dueDate: data.dueDate || null };
  } else if (data.action === 'completeTodo') {
    op = { type: 'complete', todoId: Number(data.todoId), at: Date.now() };
  } else {
    return jsonOut({ error: 'unknown action' });
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var inbox = ss.getSheetByName(ATLAS_INBOX_SHEET) || ss.insertSheet(ATLAS_INBOX_SHEET);
    inbox.appendRow([JSON.stringify(op)]);
  } finally {
    lock.releaseLock();
  }
  return jsonOut({ status: 'ok', id: op.id });
}

// ダッシュボード（index.html）の applyAtlasOps と同じ処理。変更する場合は両方そろえる
function applyAtlasOps(todos, ops) {
  ops.forEach(function(op) {
    if (op.type === 'add') {
      if (todos.some(function(t) { return t.id === op.id; })) return;
      todos.push({ id: op.id, text: op.text, memo: null, category: 'プライベート', dueDate: op.dueDate || null, priority: 'mid' });
    } else if (op.type === 'complete') {
      var t = todos.find(function(x) { return x.id === op.todoId; });
      if (t && !t.completedAt) t.completedAt = op.at;
    }
  });
  return todos;
}

// 受け箱にまだ残っている操作も反映した上で、今日の予定・未完了のTODO・最新の健康データを返す
function atlasContext() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var now = new Date();

  var todos = [];
  var syncSheet = ss.getSheetByName('AppSync');
  var raw = syncSheet && syncSheet.getRange('A1').getValue();
  if (raw) todos = JSON.parse(raw).todos || [];
  var inbox = ss.getSheetByName(ATLAS_INBOX_SHEET);
  if (inbox && inbox.getLastRow() > 0) {
    var ops = inbox.getRange(1, 1, inbox.getLastRow(), 1).getValues().map(function(r) {
      try { return JSON.parse(r[0]); } catch (e) { return null; }
    }).filter(Boolean);
    todos = applyAtlasOps(todos, ops);
  }
  // 期限が近い順（期限なしは最後）、同じ期限なら優先度順。アトラスはこの順番で「1番、2番…」と読み上げる
  var weight = { high: 0, mid: 1, low: 2 };
  var active = todos.filter(function(t) { return !t.completedAt; }).sort(function(a, b) {
    var da = a.dueDate || '9999-99-99', db = b.dueDate || '9999-99-99';
    if (da !== db) return da < db ? -1 : 1;
    return (weight[a.priority] || 1) - (weight[b.priority] || 1);
  }).map(function(t) {
    return { id: t.id, text: t.text, dueDate: t.dueDate, priority: t.priority, category: t.category };
  });

  // Googleカレンダーの画面で表示中（チェックが入っている）カレンダーの今日の予定
  var events = [];
  CalendarApp.getAllCalendars().forEach(function(cal) {
    if (cal.isHidden() || !cal.isSelected()) return;
    cal.getEventsForDay(now).forEach(function(ev) {
      var allDay = ev.isAllDayEvent();
      events.push({
        title: ev.getTitle(),
        allDay: allDay,
        start: allDay ? null : Utilities.formatDate(ev.getStartTime(), ATLAS_TZ, 'HH:mm'),
        end: allDay ? null : Utilities.formatDate(ev.getEndTime(), ATLAS_TZ, 'HH:mm')
      });
    });
  });
  events.sort(function(a, b) { return (a.start || '') < (b.start || '') ? -1 : 1; });

  var health = null;
  var healthSheet = ss.getSheetByName('HealthData');
  if (healthSheet && healthSheet.getLastRow() > 1) {
    var lastCol = healthSheet.getLastColumn();
    var header = healthSheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var row = healthSheet.getRange(healthSheet.getLastRow(), 1, 1, lastCol).getValues()[0];
    health = {};
    header.forEach(function(name, i) {
      var v = row[i];
      health[name] = Object.prototype.toString.call(v) === '[object Date]'
        ? Utilities.formatDate(v, ATLAS_TZ, 'yyyy-MM-dd') : v;
    });
  }

  return { now: Utilities.formatDate(now, ATLAS_TZ, 'yyyy-MM-dd HH:mm'), todos: active, events: events, health: health };
}
```

   アトラス用の関数を追加した場合は、デプロイの前にエディタ上部の関数選択で `atlasContext` を選んで「実行」を1回押し、カレンダーへのアクセスを許可してください（Webアプリから初めてカレンダーを読む時に許可画面は出せないため）。

5. 「デプロイ」→「新しいデプロイ」→種類「ウェブアプリ」を選択
   - 「次のユーザーとして実行」：**自分**
   - 「アクセスできるユーザー」：**全員**（ショートカットがGoogleログインなしで呼び出すために必要。doPost（健康データの書き込み・アトラス用の予定やTODOの読み書き）はすべて共有トークンで保護されているので、トークンを知らない第三者は読み書きできません。doGetはニュースのRSSを中継するだけなので非公開情報は含まれません）
6. デプロイ後に表示される **ウェブアプリのURL** をコピーしておく（iPhone側の設定と、ダッシュボードの「⚙ 設定」→「ニュース取得用 Apps Script URL」の両方で、同じURLを使います）

既に一度デプロイ済みの場合は、「デプロイ」→「デプロイを管理」→編集（鉛筆アイコン）→バージョンを「新バージョン」にして更新すれば、URLを変えずにコードだけ更新できます（iPhoneショートカット側のURL変更は不要です）。

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

## 音声アシスタント「アトラス」との連携

アトラスはMacで動く音声アシスタントです（ダッシュボードとは別のPythonプログラム）。上記のApps Scriptにアトラス用の関数を追加すると、アトラスが次のことをできるようになります。

- 今日の予定・未完了のTODO・最新の健康データを読み上げる、会話の前提にする
- TODOを追加する、完了にする（ダッシュボードのTODOリストと同じもの）

仕組み：アトラスはTODO本体（`AppSync` タブ）を直接書き換えず、`AtlasInbox` タブに「追加」「完了」の操作を1行ずつ積みます。ダッシュボードは開いた時・別のアプリから戻った時・開いている間は1分ごとに受け箱を確認し、操作をTODOリストに反映してから受け箱を空にします。ダッシュボードはTODOリストを丸ごと書き込む方式のため、アトラスが本体を直接書き換えると、その後のダッシュボードの書き込みで消えてしまうためです。

設定手順はアトラス側のREADMEを参照してください（Apps ScriptのURLと、`YOUR_SECRET_HERE` に入れた合言葉をアトラスの `.env` に書きます）。

## ライセンス・注意事項

個人利用目的のツールです。外部APIはいずれも無料枠・無認証（またはGoogleの個人認証のみ）で利用できるものを選定していますが、利用規約・レートリミットは各サービスの提供元に従ってください。健康データは機微な個人情報です。スプレッドシートは第三者と共有しない設定のまま保つことを推奨します。
