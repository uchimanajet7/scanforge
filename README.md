# ScanForge

バーコード/QR の読み取り・生成を提供する静的 WebUI + Lambda API。

公開サイト: GitHub Pages
- `https://uchimanajet7.github.io/scanforge/`
- fork で公開する場合は自分の Pages の URL を使用し、初回設定は `docs/GETTING_STARTED.md` の 1.1 に従ってください。

## WebUI クイックスタート
- オンライン: GitHub Pages `https://uchimanajet7.github.io/scanforge/`。
- ローカル: `bash scripts/tools/web/start-local-web.sh`。推奨です。`file://` 直開きではカメラ権限や Web API 制約で動作しないことがあるためです。
- ネットワーク: `start-local-web.sh` は `SWS_VERSION` 未指定の場合に `static-web-server` の最新リリース情報を取得します。未配置の場合は `tools/web/static-web-server` をダウンロードして配置します。オフラインで使う場合は `SWS_VERSION` を固定し、`tools/web/static-web-server` を事前に配置します。
  - 必要ツール: `curl` / `tar` / `lsof`。`start-local-web.sh` で使用します。
  - アクセス: `http://localhost:8000/`。既定ポートは `8000` です。ポートは `SWS_PORT` で変更できます。
- 備考: `start-local-web.sh` はキャッシュ更新のため `web/index.html` 内の `styles.css` と `app.js` の参照に `?v=` を付与します。初回は `web/index.html.original` を作成します。

操作の要点: 抜粋
- スキャン: カメラで QR / バーコードを読み取り、履歴へ追加
- 生成: テキストから QR / バーコードを生成。例: Code 128/EAN-13/UPC-A/PDF417/Data Matrix。出力: PNG/SVG。

## API クイックスタート
- 対話: `bash scripts/deploy/with_aws.sh -- bash scripts/deploy/deploy.sh`。推奨です。
- 固定プロファイル: `bash scripts/deploy/with_aws.sh --mode profile --profile <WORK_PROFILE> -- bash scripts/deploy/deploy.sh`
- スモーク: `bash scripts/deploy/smoke.sh`。デプロイ済みの状態で readiness → `/encode` → `/decode` を確認します。

### ローカルで API を起動して確認: 開発者向け
- 起動: `bash scripts/tools/api/start-local-api.sh`。既定URLは `http://127.0.0.1:8001` です。
  - ネットワーク: 初回セットアップでは `lambda/requirements.txt` の依存を pip で取得するため必要です。
- 必要ツール: `python3` / `pip` / `lsof` は `start-local-api.sh` で使用します。`curl` / `base64` / `jq` は `smoke-api.sh` と `start-local-api.sh --auto` で使用します。
- スモーク: `bash scripts/tools/api/smoke-api.sh`。`/encode`→`/decode` の往復を確認します。
- 自動: `bash scripts/tools/api/start-local-api.sh --auto`。起動→スモーク→停止を一括で行います。

## ローカル開発セットアップ: 継続的インテグレーション相当の確認
- `docs/DEV_SETUP.md`
- 例
  - `bash scripts/tools/lint_shell.sh --strict`
  - `bash scripts/tools/fmt_terraform.sh --check`
  - `bash scripts/tools/fmt_terraform.sh --validate`

## プロジェクト構成
- `web/` … WebUI: 静的配信 / GitHub Pages
- `lambda/` … API ハンドラー: `handler.py`。依存: `requirements.txt`
- `infra/terraform/` … IaC: Terraform
- `scripts/` … 開発/デプロイ補助
- `docs/` … 仕様・ガイド

## ドキュメント
- はじめに: `docs/GETTING_STARTED.md`
- デプロイ手順・トラブルシュート: `docs/DEPLOY.md`
- 仕様: 構成/ラッパー仕様/API。 `docs/SPEC.md`
- バージョン運用: `docs/VERSIONS.md`

## ライセンス
- MIT License: `LICENSE`

## 参考
- ScanForge：WebUI でバーコード生成して AWS Lambda でスキャンする: https://uchimanajet7.hatenablog.com/entry/2025/12/21/150000
