# Web 開発ガイド

このドキュメントは、ScanForge の WebUI をローカルで動かし、利用者が通常の会話と画面から WebMCP を確認するための最短手順をまとめます。WebMCP の製品契約は `docs/WEBMCP_SPEC.md` にあります。

## ローカル起動

- 起動: `bash scripts/tools/web/start-local-web.sh`
- URL: `http://localhost:8000/`
- 既定ポート: `8000`
- 必要ツール: `curl` / `tar` / `lsof`

`file://` 直開きは使いません。`start-local-web.sh` は起動時に `web/index.html` の参照へキャッシュバスターを付け、初回だけ `web/index.html.original` を作成します。

## 通常画面の最低限確認

- スキャン: カメラ権限を人が判断し、読取り結果が「最新結果」と「履歴」に反映される
- 生成: QR / バーコードを生成し、SVG / PNGを画面からダウンロードできる
- 履歴: 保存済み履歴を表示し、JSONを書き出せる

WebMCP非対応ブラウザーでも、この通常画面と操作は変わりません。

## WebMCP の利用条件

ScanForge は次の10 toolを登録します。

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

確認には、サイトツールを有効にしたChatGPTまたはCodexの内蔵ブラウザーを使います。利用可能なモデルと提供範囲はOpenAIの現行案内に従います。対応していない環境ではtool登録だけを省略し、通常画面へ専用UIを追加しません。

カメラ権限はWebMCPが許可しません。ブラウザー標準UIが表示された場合は人が判断します。

成果物の配送は依頼内容で分かれます。

- 「会話に表示」「ファイルとして受け取る」: WebMCP直接受信が通常経路
- 「ブラウザーへダウンロード」: ブラウザーダウンロードtoolが自動要求
- ブラウザー側で停止・取消・未保存: 同じ `transferId` の直接受信
- 直接受信も利用不可: 人が既存画面ボタンを使う最終手段

障害時もエージェントはBrowser skill、DOM解析、画面ボタンの自動押下へ切り替えません。

参照:

- OpenAI Site tools: <https://learn.chatgpt.com/docs/webmcp>
- WebMCP仕様: <https://webmachinelearning.github.io/webmcp/>
- Chrome WebMCP best practices: <https://developer.chrome.com/docs/ai/webmcp/best-practices>

## 通常利用による最短確認

### 1. ScanForgeを内蔵ブラウザーで開く

1. ローカルサーバーを起動します。
2. 設定で「サイトツールを有効にする」が有効であることを確認します。
3. 新しい会話で次を送ります。

> @Browser で http://localhost:8000/ を開いてください。

4. ScanForgeの通常画面が表示され、アドレスバーの「サイトツール」に10件あることを確認します。

### 2. 生成PNGを会話で受け取る

次の1回の依頼を送ります。

> ScanForgeが提供するサイトツールだけを使い、`SCANFORGE-WEBMCP-2026` をQR Code、PNG、480px、背景透過なし、可読テキストなしで生成し、そのPNGをこの会話に表示してください。ブラウザーダウンロードや通常の画面操作には代替しないでください。

正しい結果:

- 通常画面が生成タブへ移り、指定値とQRプレビューが表示される
- Sourcesに `generate-code`、`prepare-scanforge-export`、1回以上の `read-scanforge-export`、`release-scanforge-export` が記録される
- `generate-code` と直接受信結果の `generationId` が一致する
- 最終回答に検証済みPNGが画像として表示され、同じ実ファイルへのリンクもある
- ブラウザーのダウンロード一覧を使わず、画面の「結果をダウンロード」も押さない

画面が変化しただけではWebMCP利用の証拠になりません。アドレスバーの「サイトツール」→「最近使用したツール」またはSourcesでtool名を確認します。

### 3. 明示的なブラウザーダウンロードと自動フォールバック

ブラウザーダウンロードを確認するときだけ、次を送ります。

> ScanForgeが提供するサイトツールだけを使い、現在の生成結果をブラウザーへダウンロードしてください。通常の画面操作には代替しないでください。

正しい初回動作:

- Sourcesに `request-generated-code-download` が1回記録される
- tool結果は `download-requested`、`requestDispatched: true`、`transferId`、成果物情報を返す
- ブラウザーが確認を表示した場合だけ人が応答する
- エージェントは保存完了を観測したとは報告しない

ブラウザーのダウンロード一覧が「停止済み」、取消、または保存ファイルなしになった場合は、次を送ります。

> そのブラウザーダウンロードは失敗しました。同じ生成結果を、保持済みのtransferIdからScanForgeのサイトツールで直接受信し、この会話に表示してください。ダウンロードの再実行、Browser skill、DOM操作は使わないでください。

正しいフォールバック:

- `request-generated-code-download` と `prepare-scanforge-export` は再実行されない
- 先ほどの `transferId` で `read-scanforge-export` と `release-scanforge-export` が記録される
- 最終回答に、ブラウザーダウンロードで要求したものと同じファイル名・形式・SHA-256のPNGが表示される
- 人が画面ボタンを押さない

直接受信まで利用できない場合だけ、エージェントは理由を明示して停止します。その場合の最後の回復手段が、人による既存の「結果をダウンロード」です。

### 4. SVGを会話で受け取る

> ScanForgeが提供するサイトツールだけを使い、`SCANFORGE-SVG` をQR Code、SVG、480pxで生成し、そのSVGファイルをこの会話で受け取れるようにしてください。ブラウザーダウンロードや通常の画面操作には代替しないでください。

正しい結果:

- Sourcesは生成PNGと同じgenerate/prepare/read/release経路
- 最終回答に検証済みSVGへのリンクがある
- PNGとして変換せず、manifestのMIME型は `image/svg+xml`

### 5. 履歴を読み、全履歴JSONを会話で受け取る

履歴が1件以上ある状態で次を送ります。

> ScanForgeが提供するサイトツールだけを使い、最新1件のスキャン履歴を教えて、その後に全履歴JSONをこの会話で受け取れるようにしてください。ブラウザーダウンロードや通常の画面操作には代替しないでください。

正しい結果:

- Sourcesに `get-scan-history`、`prepare-scanforge-export`、1回以上の `read-scanforge-export`、`release-scanforge-export` が記録される
- 直接受信のkindは `scan-history`、MIME型は `application/json`
- 最終回答に検証済みJSONへのリンクがある
- 通常画面の履歴件数、順序、保存内容は変わらない

履歴内容の回答が不要で、JSONファイルだけを求めた場合は `get-scan-history` を呼ぶ必要はありません。履歴0件でも空 `items` を持つ正規JSONを受け取れます。

履歴JSONの明示的なブラウザーダウンロードでは `request-scan-history-download` を使います。停止時は同じ結果の `transferId` を直接受信し、同じダウンロードtoolを再実行しません。

### 6. カメラ開始、1回スキャン、停止

次を順に依頼します。

> ScanForgeが提供するサイトツールだけを使い、現在の設定でカメラとスキャンを開始してください。通常の画面操作には代替しないでください。

> ScanForgeが提供するサイトツールだけを使い、現在のカメラ映像を1回スキャンしてください。通常の画面操作には代替しないでください。

> ScanForgeが提供するサイトツールだけを使い、カメラとスキャンを停止してください。通常の画面操作には代替しないでください。

確認事項:

- 権限UIは人が許可または拒否する
- 拒否済みなら通常画面に再許可方法が表示される
- 1回スキャンは通常画面の最新結果と履歴へ反映される
- 停止後は映像とライブ検出が終了する
- Sourcesに `start-camera`、`scan-current-frame`、`stop-camera` が記録される

## 受信モジュールの契約確認

ローカル受信は `scripts/tools/web/receive-scanforge-export.mjs` が担当します。Site toolsを呼ぶ同じJavaScript実行環境からこのモジュールを使い、出力先は必ずScanForge内の次の範囲にします。

```text
<ScanForgeリポジトリの絶対パス>/_local/_ai-agent/tmp/
```

モジュールは一意な子フォルダーを作り、既存ファイルを上書きしません。ID・範囲・base64・バイト数・SHA-256・PNG/SVG/JSON固有構造を検証し、失敗時は今回の不完全ファイルだけを削除します。`release-scanforge-export` は成功・失敗の両方で実行します。

## 未対応ブラウザーの回帰確認

WebMCPを無効にした通常ブラウザーで同じURLを開きます。

- 起動エラーがない
- WebMCP専用UIや操作が表示されない
- 画面からの生成、ダウンロード、カメラ開始・停止、スキャン、履歴表示・書き出しを利用できる

## 開発者向け補助診断

通常利用の受け入れ確認とは別に、tool definitionや個別resultを調べる場合だけChrome DevToolsの Application → WebMCPを使用します。

- Available Toolsが10件である
- schemaとannotationsが `docs/WEBMCP_SPEC.md` と一致する
- Invoked Toolsに通常利用時の呼び出しとstatusが表示される

DevToolsの「Run Tool」やConsoleからの直接実行は内部診断であり、エンドユーザー経路の受け入れ確認には使用しません。
