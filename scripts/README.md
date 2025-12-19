# scripts/（開発・運用補助）

このディレクトリは ScanForge のローカル起動・スモーク・デプロイ補助を行うスクリプト群です。

## このドキュメントの役割
- よく使う入口（コマンド）を一覧化する
- 詳細手順の SSOT は以下を参照する
  - Web: `docs/GETTING_STARTED.md`, `docs/WEB_DEV_GUIDE.md`
  - API デプロイ: `docs/DEPLOY.md`

## よく使うコマンド

### WebUI（ローカル起動）
- 起動（推奨）: `bash scripts/tools/web/start-local-web.sh`
  - `web/index.html` の `styles.css` / `app.js` に `?v=` を付与してから Static Web Server を起動します。

### キャッシュバスティング（単体）
- 自動バージョン: `bash scripts/tools/web/apply-cache-bust.sh`
- 固定バージョン: `bash scripts/tools/web/apply-cache-bust.sh <VERSION>`

### ローカル API（/encode → /decode の往復確認）
- 起動: `bash scripts/tools/api/start-local-api.sh`
- スモーク: `bash scripts/tools/api/smoke-api.sh`
- 自動（起動→スモーク→停止）: `bash scripts/tools/api/start-local-api.sh --auto`

### AWS へデプロイ
- 入口（推奨）: `bash scripts/deploy/with_aws.sh -- bash scripts/deploy/deploy.sh`
- スモーク: `bash scripts/deploy/with_aws.sh -- bash scripts/deploy/smoke.sh`
