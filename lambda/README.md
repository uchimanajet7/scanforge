# Lambda（ScanForge API）

このディレクトリは ScanForge の API 実装（`lambda/handler.py`）と依存定義（`lambda/requirements.txt`）を管理します。

## このドキュメントの役割
- **この README は “Lambda 実装の概要” を示す**（デプロイ手順の SSOT ではない）
- デプロイ手順（SSOT）: `docs/DEPLOY.md`
- 仕様（SSOT）: `docs/SPEC.md`
- Terraform の詳細: `infra/terraform/README.md`

## 現行のデプロイ構成（要点）
- ランタイム: Python 3.13
- 公開: Lambda Function URL（認証: NONE）
- CORS: Terraform で設定（既定）
  - `cors_allow_origins = ["*"]`
  - `allow_methods = ["POST"]`
  - `allow_headers = ["Content-Type", "Origin"]`
- SnapStart: Terraform の `enable_snapstart` で制御（既定: `true`）
- 依存: `lambda/requirements.txt`（純 Python + `zxing-cpp`）
  - 依存は “レイヤー” として作成してアタッチする（作成は `bash scripts/deploy/build_layer.sh --arch x86_64`）

## 環境変数
- `MAX_IMAGE_BYTES`（任意。既定: 3145728 = 3MB）
  - `/decode` の入力画像サイズ上限（`barcodeData` / `barcodeUrl` の取得結果）に使用します。

## ローカル確認（開発者向け）
- 起動: `bash scripts/tools/api/start-local-api.sh`（既定: `http://127.0.0.1:8001`）
- スモーク（`/encode` → `/decode`）: `bash scripts/tools/api/smoke-api.sh`
- 自動（起動→スモーク→停止）: `bash scripts/tools/api/start-local-api.sh --auto`

## エンドポイント（概要）
- `POST /encode`: 指定テキストから QR / Code128 を生成（`output=svg|png`）
- `POST /decode`: 画像（`barcodeData` / `barcodeUrl`）からバーコードを検出して返す

詳細な入出力とエラー仕様は `docs/SPEC.md` を参照してください。
