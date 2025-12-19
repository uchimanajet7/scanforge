# Terraform（ScanForge API）

このディレクトリは ScanForge API の AWS リソースを Terraform で管理します。

## このドキュメントの役割
- Terraform 管理対象・入力（variables）・出力（outputs）を説明する
- デプロイ手順の SSOT: `docs/DEPLOY.md`（`bash scripts/deploy/with_aws.sh -- bash scripts/deploy/deploy.sh`）
- API の入出力仕様の SSOT: `docs/SPEC.md`

## 管理対象（作成される主なリソース）
- Lambda 関数（Python 3.13）: `aws_lambda_function.api`
- 依存レイヤー: `aws_lambda_layer_version.deps`（`layer_zip_path` 指定時）
- 公開用エイリアス: `aws_lambda_alias.prod`（SnapStart は PublishedVersions で有効化）
- Function URL（認証なし）: `aws_lambda_function_url.url`
- CloudWatch Logs: `aws_cloudwatch_log_group.fn`
- IAM（基本ログ権限）: `aws_iam_role.lambda` / `aws_iam_role_policy_attachment.basic_logs`

## 前提
- Terraform v1.5+（推奨: 1.6+）
- AWS Provider v6.x
- 既定値（variables）
  - タイムアウト: 10 秒（`lambda_timeout_seconds`）
  - メモリ: 512MB（`lambda_memory_mb`）
  - /tmp: 512MB（`lambda_tmp_mb`）
  - Logs 保持: 14日（`log_retention_days`）
  - SnapStart: `true`（`enable_snapstart`）

## CORS（Function URL）
Terraform は Function URL に以下の CORS を設定します（既定）。
- `allow_origins = cors_allow_origins`（既定: `["*"]`）
- `allow_methods = ["POST"]`
- `allow_headers = ["Content-Type", "Origin"]`
- `allow_credentials = false`
- `max_age = 600`

## 主要な入力（variables）
- `aws_region`（必須）
- `function_name`（既定: `scanforge-api`）
- `alias_name`（既定: `prod`）
- `architecture`（`x86_64|arm64`。既定: `x86_64`）
- `enable_snapstart`（既定: `true`）
- `cors_allow_origins`（既定: `["*"]`）
- レイヤー指定（どちらか必須）
  - `layer_zip_path`（例: `build/scanforge-layer.zip`）
  - `existing_layer_arn`（既存レイヤーを使う場合）

## 出力（outputs）
- `function_url` … Function URL（`alias_name` に紐付け）
- `function_arn` … 関数 ARN
- `alias_arn` … エイリアス ARN
- `layer_arn` … 依存レイヤー ARN（既存指定時はその ARN）
