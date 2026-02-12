# デプロイ手順: auth → setup → deploy フロー

この手順は、用途別に分割したスクリプト群と、それらを順に呼び出すエントリーポイント `deploy.sh` を使って、認証からスモークテストまで一気通貫で実行します。途中で失敗しても、該当フェーズだけ再実行できます。

## 0. 前提: ツール
- AWS アカウントと必要権限: IAM: Lambda / Logs など
- 必要ツール:
  - Terraform 1.5+。
  - AWS CLI v2
  - Python 3 + pip。レイヤー作成に使用します。依存レイヤーは Python 3.13 ランタイム向けに作成します。
  - jq。レスポンス整形に使用します。
  - curl, zip, base64

バージョン確認: 任意  
`bash scripts/tools/check_versions.sh`

最新差分確認: 任意  
`bash scripts/tools/check_updates.sh`
このコマンドはネットワークが必要です。

## 1. 認証: with_aws.sh に一元化
認証はラッパー `scripts/deploy/with_aws.sh` に一元化します。`deploy.sh` は認証を行いません。`with_aws.sh` が一時クレデンシャルをプロセス環境へ注入するためです。

### 推奨: profile
- 対話。既定は profile。プロファイル選択 UI。
`bash scripts/deploy/with_aws.sh -- bash scripts/deploy/deploy.sh`

- 固定プロファイル
`bash scripts/deploy/with_aws.sh --mode profile --profile <WORK_PROFILE> -- bash scripts/deploy/deploy.sh`

### auth モード: AssumeRole + MFA
`bash scripts/deploy/with_aws.sh --mode auth --base-profile <BASE_PROFILE> --role-arn arn:aws:iam::<ACCOUNT_ID>:role/<ROLE_NAME> --mfa-arn arn:aws:iam::<ACCOUNT_ID>:mfa/<DEVICE> --duration 3600 -- bash scripts/deploy/deploy.sh`

## 2. 一括実行: 推奨は deploy.sh
`deploy.sh` は以下を順に実施します。

1) `setup.sh`: 入力収集。region / arch / terraform apply 自動承諾可否  
2) `build_layer.sh`: 依存レイヤーZIP作成  
3) `make_tfvars.sh`: `infra/terraform/dev.auto.tfvars` を生成  
4) `tf_init.sh` → `tf_plan.sh` → `tf_apply.sh`: Terraform  
5) `smoke.sh`: readiness → `/encode` → `/decode`  

実行: 対話
`bash scripts/deploy/with_aws.sh -- bash scripts/deploy/deploy.sh`

## 3. 手動手順: 参考: 低レベル操作
### 3.1 レイヤー作成
`bash scripts/deploy/build_layer.sh --arch x86_64`
このコマンドは pip で依存を取得するためネットワークが必要です。

### 3.2 tfvars: 例
`infra/terraform/dev.auto.tfvars` は `make_tfvars.sh` が生成するファイルです。形式の確認には `infra/terraform/dev.auto.tfvars.example` を参照してください。

`aws_region        = "ap-northeast-1"`
`function_name     = "scanforge-api"`
`alias_name        = "prod"`
`architecture      = "x86_64"`
`lambda_timeout_seconds = 15`
`lambda_memory_mb  = 512`
`lambda_tmp_mb     = 512`
`log_retention_days = 14`
`enable_snapstart   = true`
`layer_zip_path     = "build/scanforge-layer.zip"`
`existing_layer_arn = ""`
`cors_allow_origins = ["*"]`

### 3.3 Terraform 実行
`terraform -chdir=infra/terraform init`
`bash scripts/deploy/with_aws.sh -- terraform -chdir=infra/terraform plan -var-file=dev.auto.tfvars`
`bash scripts/deploy/with_aws.sh -- terraform -chdir=infra/terraform apply -var-file=dev.auto.tfvars`

## 4. 動作確認: スモーク: デプロイ済みの状態で実行
`bash scripts/deploy/smoke.sh`

## 5. 片付け: destroy
`bash scripts/deploy/with_aws.sh -- bash scripts/deploy/destroy.sh`

- Terraform 管理の全リソースを削除します。
- 実行前に確認が入ります。既定は N です。`--yes` 指定時のみ無人で実行します。
  - 案内行: 「destroy の前に確認します」。既定は N。
  - 本プロンプト: 「destroy を実行しますか？ [y/N]」

無人化。注意: 破壊的。
`bash scripts/deploy/with_aws.sh -- bash scripts/deploy/destroy.sh --yes`

## 6. トラブルシュート: 要点
- `pip install` で wheel が見つからない
  - `lambda/requirements.txt` の依存、特に `zxing-cpp` と、`--arch` の組み合わせを確認してください。
- `terraform` の認証エラー
  - `deploy.sh` は認証しません。必ず `with_aws.sh` 経由で実行してください。
- `smoke.sh` が Function URL を取得できない
  - `terraform apply` 済みか、`infra/terraform` の outputs を確認してください: `bash scripts/deploy/tf_outputs.sh`。

## 7. 参考
- 仕様: `docs/SPEC.md`
- Terraform 詳細: `infra/terraform/README.md`
