# ScanForge WebMCP 仕様書

## ドキュメント情報

- 対象: ScanForge WebUI の恒久的な WebMCP 製品契約
- 最終更新日: 2026-09-06 JST
- 状態: 確定
- 人向け機能仕様: `docs/SPEC.md`
- 開発・確認手順: `docs/WEB_DEV_GUIDE.md`

本書は WebMCP 固有の登録、入出力、成果物配送、副作用、権限境界だけを定義する。人が画面から利用するスキャン、生成、履歴の一般仕様は `docs/SPEC.md` に残す。

## 1. 目的と責任境界

ScanForge は、通常画面の操作感を変えず、人とエージェントが同じ生成フォーム、プレビュー、カメラ状態、検出結果、履歴を共有できるようにする。WebMCP 専用の別画面、別状態、別レンダラー、別履歴は作らない。

成果物の配送は次の順序で扱う。

1. 利用者が生成結果や履歴ファイルを会話で受け取るよう依頼した場合は、WebMCP の直接受信を通常経路とする。
2. 利用者がブラウザーのダウンロード一覧への保存を明示した場合だけ、専用 tool が既存画面と同じブラウザーダウンロード処理を自動で1回要求する。
3. ブラウザーまたは利用者が停止・取消・未保存を報告した場合は、同じダウンロード tool を繰り返さず、その tool が保持した同一 `transferId` の成果物を WebMCP で直接受信する。
4. 直接受信も利用できない場合だけ、人が既存の「結果をダウンロード」または「履歴を書き出す」を使う。

エージェントは障害時にも Browser skill、DOM解析、通常ボタンの自動押下へ切り替えない。通常経路へ WebMCP 専用のボタン、トースト、パネル、モーダルを追加しない。

ブラウザーダウンロード tool が観測できるのは、ScanForge が要求を同期的に呼び出せたかまでである。ブラウザーまたはOSによる受理、保存完了、保存先は観測しない。直接受信は別経路で実データを取得・検証し、会話へ画像またはファイルリンクとして渡す。

## 2. 公開範囲

WebMCP が扱う操作は次の10件である。

1. コードを生成する
2. 現在の生成結果についてブラウザーダウンロードを要求する
3. カメラとライブ検出を開始する
4. 現在のカメラ映像を1回スキャンする
5. カメラとライブ検出を停止する
6. 保存済みスキャン履歴を限定件数読み取る
7. 保存済みスキャン履歴全体のJSONについてブラウザーダウンロードを要求する
8. 生成結果または履歴JSONの直接受信を準備する
9. 準備済み成果物を範囲指定で読み取る
10. 準備済み成果物をページ内メモリーから解放する

次の操作は公開しない。

- カメラ権限の許可または変更
- カメラデバイスまたは検出設定の切り替え
- クリップボードへのコピー
- 履歴の削除または消去
- 任意URL、任意Blob、任意ファイルの取得またはダウンロード
- 画像ファイル、base64、URLを入力とするスキャン
- Lambda API の汎用 encode/decode ラッパー
- コンテスト専用モード、UI、データ、計測

## 3. 基盤契約

### 3.1 APIとprogressive enhancement

- imperative API の `document.modelContext.registerTool()` を使用する。
- API がない環境では登録を省略し、通常画面を変更せず起動を継続する。
- 宣言型WebMCP、polyfill、MCP SDK、追加パッケージ、ビルド工程を導入しない。
- `exposedTo` は指定せず、同一オリジンの既定境界を維持する。
- top-level document だけで登録する。

### 3.2 登録と実行のキャンセル

- 全10 toolを単一の登録用 `AbortController` で登録する。
- 登録signalのabortで10件すべてを解除する。
- 各executeは `options.signal` を受け、状態変更や非同期処理の前後にキャンセルを確認する。
- キャンセル時は固定failureへ変換せず、`signal.reason` をthrowする。
- カメラ取得は取得promiseとexecute signalを競合させ、キャンセル後に遅れて取得したstreamの全trackを停止する。
- 直接受信準備がキャンセルされた場合は、返却前の準備済み成果物を解放する。

### 3.3 annotations

- `get-scan-history` と `read-scanforge-export` は `readOnlyHint: true` とする。
- 残り8件は画面、プレビュー、カメラ、ブラウザーダウンロード要求、またはページ内の成果物保持状態を変更するため `readOnlyHint: false` とする。
- 外部入力由来の文字列または成果物バイト列を返す `scan-current-frame`、`get-scan-history`、`read-scanforge-export` は `untrustedContentHint: true` とする。

### 3.4 共通入力と失敗

- Input Schema はすべて `type: "object"`、`additionalProperties: false` とする。
- JSON Schemaだけに依存せず、execute境界でも同じ制約を検証する。
- 未知フィールド、型違反、列挙外、範囲外は状態変更前に拒否する。
- キャンセル以外の通常failureは `{ "ok": false, "status": <code>, "message": <fixed-message> }` とする。
- 内部例外、入力文字列、画像、SVG、Blob、device id、engine、raw detector objectをfailureへ含めない。

## 4. 公開ツール一覧

| name | 主目的 | readOnly | untrusted |
|---|---|---:|---:|
| `generate-code` | 現在の画面設定でコードを生成 | false | false |
| `request-generated-code-download` | 生成結果のブラウザーダウンロードを明示時だけ要求 | false | false |
| `start-camera` | カメラとライブ検出を開始 | false | false |
| `scan-current-frame` | 開始済みカメラを1回読む | false | true |
| `stop-camera` | カメラとライブ検出を停止 | false | false |
| `get-scan-history` | 保存済み履歴を限定件数読む | true | true |
| `request-scan-history-download` | 履歴JSONのブラウザーダウンロードを明示時だけ要求 | false | false |
| `prepare-scanforge-export` | 直接受信用の不変スナップショットを準備 | false | false |
| `read-scanforge-export` | 準備済み成果物を分割して読む | true | true |
| `release-scanforge-export` | 準備済み成果物を解放 | false | false |

## 5. 生成と生成結果の識別

### 5.1 `generate-code`

入力は `text` を必須とし、`format`、`output`、`size`、`includeText`、`transparent` を任意とする。省略値は呼び出し時点の通常画面の値を使う。

実行は同じ生成フォーム、runner、renderer、previewを使う。成功した各プレビューに一意な `generationId` を付け、結果へ返す。ダウンロード、コピー、履歴保存は行わず、SVGやPNGの本体も結果へ含めない。

```json
{
  "ok": true,
  "status": "generated",
  "generationId": "generation-...",
  "format": "qrcode",
  "output": "png",
  "requestedSize": 480,
  "width": 462,
  "height": 462,
  "includeText": false,
  "transparentApplied": false,
  "logoApplied": false
}
```

固定failureは `invalid-input`、`invalid-text`、`generator-unavailable`、`renderer-unavailable`、`render-failed` とする。

### 5.2 生成結果の同一性

- 生成直後の直接受信では、`prepare-scanforge-export` に `generate-code` が返した `generationId` を渡す。
- 明示的なブラウザーダウンロードでも、直前に生成した結果を指定する場合は `request-generated-code-download` に同じ `generationId` を渡す。
- 指定IDと現在のプレビューが異なる場合は `generation-mismatch` とし、別の生成結果を暗黙に配送しない。
- 画面から既に生成済みの現在プレビューを対象にする場合だけ、`generationId` を省略できる。

## 6. 直接受信契約

### 6.1 `prepare-scanforge-export`

入力:

```json
{
  "kind": "generated-code",
  "generationId": "generation-..."
}
```

`kind` は `generated-code` または `scan-history`。`scan-history` に `generationId` は指定しない。

生成結果はPNGまたはSVG、履歴は既存の全履歴書き出しと同じJSONを、準備時点の不変 `Blob` として保持する。成功結果は本文を含めず、次のmanifestを返す。

```json
{
  "ok": true,
  "status": "export-prepared",
  "transferId": "transfer-...",
  "kind": "generated-code",
  "generationId": "generation-...",
  "artifact": {
    "fileName": "scanforge-normal-qr-code-....png",
    "format": "png",
    "mimeType": "image/png",
    "byteLength": 7341,
    "sha256": "...",
    "width": 462,
    "height": 462
  }
}
```

履歴JSONでは `generationId`、`width`、`height` の代わりに `itemCount` を返す。固定failureは `invalid-input`、`preview-unavailable`、`generation-mismatch`、`export-prepare-failed` とする。

### 6.2 `read-scanforge-export`

入力は `transferId`、0以上の `offset`、1–262144の `maxBytes`。結果は同一スナップショットの指定範囲だけをbase64で返す。

```json
{
  "ok": true,
  "status": "export-chunk",
  "transferId": "transfer-...",
  "kind": "generated-code",
  "generationId": "generation-...",
  "offset": 0,
  "nextOffset": 262144,
  "eof": false,
  "base64": "..."
}
```

受信側はbase64をモデルの文章として転記せず、同じ実行環境で順番に復号・保存する。各チャンクのID、範囲、長さ、終端を検証し、完成後にmanifestのバイト数、SHA-256、形式固有の構造と内容を検証する。

固定failureは `invalid-input`、`transfer-unavailable`、`invalid-range`、`export-read-failed` とする。

### 6.3 `release-scanforge-export`

入力は `transferId`。受信の成否にかかわらず最後に必ず呼ぶ。生成画面、プレビュー、履歴、受信済みファイルは変更せず、ページ内に保持した成果物だけを解放する。

```json
{
  "ok": true,
  "status": "export-released",
  "transferId": "transfer-...",
  "released": true
}
```

既に置換・解放済みなら `export-not-found` と `released: false` を返す。

### 6.4 保持上限とライフサイクル

- ページ内に保持するのは `generated-code` と `scan-history` を各1件、最大2件だけとする。
- 同じkindを新しく準備すると、そのkindの旧 `transferId` は無効になる。他方のkindには影響しない。
- 保持対象は準備時のBlobであり、その後に画面の生成結果や履歴が変わっても内容は変わらない。
- 受信完了、検証失敗、キャンセルのいずれでも `release-scanforge-export` を呼ぶ。

### 6.5 ローカル受信と会話への提示

ScanForge同梱の `scripts/tools/web/receive-scanforge-export.mjs` を、Site toolsを呼び出している同じJavaScript実行環境から使用する。

受信側は次を満たす。

- 出力先はScanForge内の `_local/_ai-agent/tmp/` 以下を絶対パスで明示する。
- `prepare` → 全 `read` → 保存・検証 → `release` を実行する。
- ブラウザーダウンロード失敗から移る場合は、ダウンロードtoolの結果を `preparedExport` として渡し、別の `prepare` で同一成果物を置換しない。
- 既存ファイルを上書きせず、失敗時は今回作成した不完全ファイルだけを削除する。
- PNGは検証済み実ファイルを画像として会話へ埋め込み、同じファイルへのリンクも返す。
- SVGと履歴JSONは検証済み実ファイルへのリンクを返す。

## 7. ブラウザーダウンロード契約

### 7.1 `request-generated-code-download`

利用者がブラウザーのダウンロード一覧への保存を明示した場合だけ使用する。入力は任意の `generationId` だけを受け取る。

1. 現在の生成結果を不変スナップショットとして準備する。
2. そのスナップショットと同じBlob・ファイル名で、通常画面と同じダウンロード処理を自動で1回呼ぶ。
3. スナップショットは解放せず、結果へ `transferId` を返す。
4. 同期呼び出しが例外になっても、準備済みスナップショットを保持して直接受信を可能にする。

### 7.2 `request-scan-history-download`

利用者がブラウザーのダウンロード一覧への保存を明示した場合だけ使用する。入力は空objectである。

全履歴JSONを不変スナップショットとして準備し、その同じBlob・ファイル名で通常画面と同じ処理を自動で1回呼ぶ。履歴0件でも通常画面と同じ空 `items` のJSONを対象にする。

### 7.3 共通結果とフォールバック

同期要求を呼び出せた場合:

```json
{
  "status": "download-requested",
  "requestDispatched": true,
  "automatic": true,
  "browserAcceptance": "not-observable",
  "saveCompletion": "not-observable",
  "transferId": "transfer-...",
  "kind": "generated-code",
  "generationId": "generation-...",
  "artifact": {
    "fileName": "scanforge-normal-qr-code-....png",
    "format": "png",
    "mimeType": "image/png",
    "byteLength": 7341,
    "sha256": "...",
    "width": 462,
    "height": 462
  },
  "fallback": {
    "webMcpDirectTransfer": {
      "available": true,
      "sameArtifact": true,
      "readTool": "read-scanforge-export",
      "releaseTool": "release-scanforge-export"
    },
    "manualControl": {
      "lastResort": true,
      "label": "結果をダウンロード"
    }
  }
}
```

同期呼び出しが例外になった場合は `status: "download-request-failed"`、`requestDispatched: false` とし、同じ `transferId` と直接受信情報を返す。同期要求後にブラウザーが停止した場合、tool結果は遡って変わらないため、ブラウザーまたは利用者からの報告を根拠に同じ `transferId` を直接受信する。

次の行為は禁止する。

- 同じダウンロードtoolの再実行
- 別の `prepare-scanforge-export` によるスナップショットの置換
- Browser skill、DOM解析、通常ボタンの自動押下への切替
- `download-requested` を保存完了として報告すること

## 8. カメラと履歴読取り

### 8.1 `start-camera`

- スキャン画面へ切り替え、人の開始ボタンと同じ開始処理を使う。
- カメラ権限はブラウザー標準UIと人に残し、toolは許可や設定変更を行わない。
- 開始済みはidempotentに扱い、開始中・拒否済み・未検出・使用中・取消・一般失敗を固定statusへ分ける。

### 8.2 `scan-current-frame`

- カメラ未開始なら自動開始せず `camera-inactive` を返す。
- 既存の1回スキャンと検出反映処理を使い、通常画面の最新結果と履歴を更新する。
- 結果は先頭20件、各textは先頭4296 Unicode code pointまでに制限し、画像・device・engine・bounding box・raw detector dataを返さない。

### 8.3 `stop-camera`

- 人の停止操作と同じ停止処理を使う。
- 開始中なら内部処理をabortし、開始済みならcontinuous detectionと全media trackを停止する。
- 停止済みはidempotentに扱い、ブラウザー権限設定や履歴を変更しない。

### 8.4 `get-scan-history`

- limitは省略時10、範囲1–100。
- 保存配列を変更せず、最新順の新しいobjectへ安全に投影する。
- `source` は既知値または `unknown`、timestampは妥当なISO 8601または `null` とする。
- UI遷移、localStorage書込み、ファイル作成を行わない。

## 9. 登録ライフサイクル

通常UI初期化後、`scanforge:ready` より前に次の順で逐次登録する。

1. `generate-code`
2. `request-generated-code-download`
3. `start-camera`
4. `scan-current-frame`
5. `stop-camera`
6. `get-scan-history`
7. `request-scan-history-download`
8. `prepare-scanforge-export`
9. `read-scanforge-export`
10. `release-scanforge-export`

- 未対応環境は `{ "supported": false, "registered": 0 }` を返す。
- 途中失敗は新しいcontrollerをabortし、部分登録を残さず `{ "supported": true, "registered": 0 }` を返す。
- 全成功は `{ "supported": true, "registered": 10 }` を返す。
- 登録失敗は通常アプリの起動失敗にしない。
- 入力値、生成内容、検出文字列、履歴内容、成果物本文をログへ記録しない。

## 10. 既存処理との接続

- 生成: `generate-code` と人のsubmitは同じrunnerとrendererを使う。
- 生成成果物: 通常画面のダウンロード、ブラウザーダウンロードtool、直接受信準備は同じ現在プレビューから同じartifactを作る。
- 履歴成果物: 通常画面の書き出し、ブラウザーダウンロードtool、直接受信準備は同じ履歴JSON生成処理を使う。
- カメラ開始・停止・1回スキャンは人の画面操作と同じ製品処理を使う。
- 履歴読取りは保存配列を変更しない既存queryを使う。
- WebMCP APIの参照はWebMCP registry境界だけに置く。

## 11. 完了条件

- 対応環境で本書の10件だけが登録される。
- 未対応環境で通常UI、生成、ダウンロード、スキャン、履歴が従来どおり動く。
- 会話で成果物を受け取る依頼は直接受信を使い、PNGの画像表示またはSVG/JSONのファイルリンクまで完了する。
- 直接受信はID、範囲、バイト数、SHA-256、形式固有内容を検証し、不完全ファイルを成功扱いしない。
- 明示的なブラウザーダウンロードは最初に自動要求し、画面ボタンを最初から人に押させない。
- ブラウザー失敗時は同じ `transferId` の直接受信へ移り、同じダウンロードtool、DOM操作、Browser skillへ切り替えない。
- 人の画面ボタンは直接受信も利用できない障害時の最終手段だけである。
- `download-requested` は保存完了を意味せず、観測不能な事実を報告しない。
- 生成PNG、生成SVG、履歴JSONを同じprepare/read/release契約で扱う。
- 受信の成否にかかわらずページ内成果物を解放し、保持数は最大2件である。
- カメラ権限拒否を回復不能な内部エラーにせず、通常画面に復旧方法を示す。
- WebMCP専用UI、依存、バックエンド、Service Worker、外部ストレージ、外部サービスを追加しない。
