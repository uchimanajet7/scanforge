# scripts: 開発・運用補助

このディレクトリは ScanForge のローカル起動・スモーク・デプロイ補助を行うスクリプト群です。

## このドキュメントの役割
- よく使う入口となるコマンドを一覧化する
- 詳細手順は以下を参照する
  - Web: `docs/GETTING_STARTED.md`, `docs/WEB_DEV_GUIDE.md`
  - API デプロイ: `docs/DEPLOY.md`

## よく使うコマンド

### WebUI: ローカル起動
- 起動: `bash scripts/tools/web/start-local-web.sh`。推奨です。
  - 必要ツール: `curl` / `tar` / `lsof`。`start-local-web.sh` で使用します。
- キャッシュ更新のため、`web/index.html` 内の `styles.css` と `app.js` の参照に `?v=` を付与します。初回は `web/index.html.original` を作成します。Static Web Server を起動します。

### キャッシュバスティング: 単体
- 自動バージョン: `bash scripts/tools/web/apply-cache-bust.sh`
- 固定バージョン: `bash scripts/tools/web/apply-cache-bust.sh <VERSION>`

### ローカル API
- `/encode`→`/decode` の往復を確認します。
- 起動: `bash scripts/tools/api/start-local-api.sh`
- 必要ツール: `python3` / `pip` / `lsof` は `start-local-api.sh` で使用します。`curl` / `base64` / `jq` は `smoke-api.sh` と `start-local-api.sh --auto` で使用します。
- スモーク: `bash scripts/tools/api/smoke-api.sh`
- 自動: `bash scripts/tools/api/start-local-api.sh --auto`。起動→スモーク→停止を一括で行います。

### AWS へデプロイ
- 入口: `bash scripts/deploy/with_aws.sh -- bash scripts/deploy/deploy.sh`。推奨です。
- スモーク: デプロイ済みの状態で `bash scripts/deploy/smoke.sh` を実行します。
