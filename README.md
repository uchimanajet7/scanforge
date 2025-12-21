# ScanForge

バーコード/QR の読み取り・生成を提供する静的 WebUI + Lambda API。

公開サイト（GitHub Pages）
- `https://uchimanajet7.github.io/scanforge/`

## WebUI クイックスタート
- オンライン: `https://uchimanajet7.github.io/scanforge/`
- ローカル（推奨: カメラ動作のため）: `bash scripts/tools/web/start-local-web.sh`
  - アクセス: `http://localhost:8000/`（既定。ポートは `SWS_PORT` で変更可能）

操作の要点（抜粋）
- スキャン: カメラで QR / バーコードを読み取り、履歴へ追加
- 生成: テキストから QR / バーコードを生成（Code 128/EAN-13/UPC-A/PDF417/Data Matrix など、PNG/SVG）

## API クイックスタート
- 対話（推奨）
  - `bash scripts/deploy/with_aws.sh -- bash scripts/deploy/deploy.sh`
- 固定プロファイル
  - `bash scripts/deploy/with_aws.sh --mode profile --profile <WORK_PROFILE> -- bash scripts/deploy/deploy.sh`
- スモーク（Function URL readiness → `/encode` → `/decode`）
  - `bash scripts/deploy/with_aws.sh -- bash scripts/deploy/smoke.sh`

### ローカルで API を起動して確認（開発者向け）
- 起動: `bash scripts/tools/api/start-local-api.sh`（既定: `http://127.0.0.1:8001`）
- スモーク: `bash scripts/tools/api/smoke-api.sh`（`/encode`→`/decode` の往復確認）
- 自動（起動→スモーク→停止）: `bash scripts/tools/api/start-local-api.sh --auto`

## Developer Setup（ローカルでCI相当の確認）
- `docs/DEV_SETUP.md`
- 例
  - `bash scripts/tools/lint_shell.sh --strict`
  - `bash scripts/tools/fmt_terraform.sh --check`
  - `bash scripts/tools/fmt_terraform.sh --validate`

## プロジェクト構成
- `web/` … WebUI（静的配信 / GitHub Pages）
- `lambda/` … API ハンドラー（`handler.py`）と依存（`requirements.txt`）
- `infra/terraform/` … IaC（Terraform）
- `scripts/` … 開発/デプロイ補助
- `docs/` … 仕様・ガイド

## ドキュメント
- はじめに: `docs/GETTING_STARTED.md`
- デプロイ手順・トラブルシュート: `docs/DEPLOY.md`
- 仕様（構成/ラッパー仕様/API）: `docs/SPEC.md`
- バージョン運用: `docs/VERSIONS.md`

## ライセンス
- MIT License: `LICENSE`

## Notes
<p><a href="https://uchimanajet7.hatenablog.com/entry/2025/12/21/150000">ScanForge：WebUI でバーコード生成して AWS Lambda でスキャンする</a></p>