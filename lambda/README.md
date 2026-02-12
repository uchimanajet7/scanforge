# Lambda: ScanForge API

このディレクトリは ScanForge の API 実装 `lambda/handler.py` と、依存定義 `lambda/requirements.txt` を管理します。

## このドキュメントの役割
- **この README は “Lambda 実装の概要” を示す**。デプロイ手順の「正」は別ドキュメントです。
- デプロイ手順: `docs/DEPLOY.md`
- 仕様: `docs/SPEC.md`
- Terraform の詳細: `infra/terraform/README.md`

## 現行のデプロイ構成: 要点
- ランタイム: Python 3.13
- 公開: Lambda Function URL。認証は NONE です。
- CORS: Terraform で設定。既定値です。
  - `cors_allow_origins = ["*"]`
  - `allow_methods = ["POST"]`
  - `allow_headers = ["Content-Type", "Origin"]`
- SnapStart: Terraform の `enable_snapstart` で制御します。既定値は `true` です。
- 依存: `lambda/requirements.txt`。requests、segno、python-barcode、Pillow、numpy、zxing-cpp を使用します。
  - 依存は “レイヤー” として作成してアタッチします。作成は `bash scripts/deploy/build_layer.sh --arch x86_64` です。

## 環境変数
- `MAX_IMAGE_BYTES`: 任意です。既定値は 3145728 = 3MB です。
  - `/decode` の入力画像サイズ上限に使用します。`barcodeData` と `barcodeUrl` の取得結果が対象です。

## ローカル確認: 開発者向け
- 起動: `bash scripts/tools/api/start-local-api.sh`。既定URLは `http://127.0.0.1:8001` です。
  - ネットワーク: 初回セットアップでは `lambda/requirements.txt` の依存を pip で取得するため必要です。
- 必要ツール: `python3` / `pip` / `lsof` は `start-local-api.sh` で使用します。`curl` / `base64` / `jq` は `smoke-api.sh` と `start-local-api.sh --auto` で使用します。
- スモーク: `bash scripts/tools/api/smoke-api.sh`。確認内容は `/encode` → `/decode` です。
- 自動: `bash scripts/tools/api/start-local-api.sh --auto`。起動→スモーク→停止を一括で行います。

## エンドポイント: 概要
- `POST /encode`: 指定テキストから QR / Code128 を生成します。output は `svg` または `png` です。
- `POST /decode`: 画像からバーコードを検出して返します。入力は `barcodeData` または `barcodeUrl` です。

詳細な入出力とエラー仕様は `docs/SPEC.md` を参照してください。
