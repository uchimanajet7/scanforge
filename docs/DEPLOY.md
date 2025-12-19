# デプロイ手順（auth → setup → deploy フロー）

この手順は、用途別に分割したスクリプト群と、順に呼び出すエントリーポイント（`deploy.sh`）で、認証からスモークテストまで一気通貫で実行します。途中で失敗しても、該当フェーズだけ再実行できます。

## 0. 前提: ツール
- AWS アカウントと必要権限（IAM: Lambda / Logs など）
- 必要ツール:
  - Terraform 1.5+（推奨: 1.6+）
  - AWS CLI v2
  - Python 3.13 + pip（レイヤー作成に使用）
  - jq（レスポンス整形に使用）
  - curl, zip

バージョン確認: 任意  
`bash scripts/tools/check_versions.sh`

最新差分確認: 任意  
`bash scripts/tools/check_updates.sh`

## 1. 認証（with_aws.sh に一元化）
認証はラッパー `scripts/deploy/with_aws.sh` に一元化します。`deploy.sh` は認証を行いません。`with_aws.sh` が一時クレデンシャルをプロセス環境へ注入するためです。

### 推奨（profile）
- 対話（既定=profile。プロファイル選択 UI）
`bash scripts/deploy/with_aws.sh -- bash scripts/deploy/deploy.sh`

- 固定プロファイル
`bash scripts/deploy/with_aws.sh --mode profile --profile <WORK_PROFILE> -- bash scripts/deploy/deploy.sh`

### auth モード（AssumeRole + MFA）
`bash scripts/deploy/with_aws.sh --mode auth --base-profile <BASE_PROFILE> --role-arn arn:aws:iam::<ACCOUNT_ID>:role/<ROLE_NAME> --mfa-arn arn:aws:iam::<ACCOUNT_ID>:mfa/<DEVICE> --duration 3600 -- bash scripts/deploy/deploy.sh`

## 2. 一括実行（推奨: deploy.sh）
`deploy.sh` は以下を順に実施します。

1) `setup.sh`（入力収集: region / arch / SnapStart / apply方針 など）  
2) `build_layer.sh`（依存レイヤーZIP作成）  
3) `make_tfvars.sh`（`infra/terraform/dev.auto.tfvars` を生成）  
4) `tf_init.sh` → `tf_plan.sh` → `tf_apply.sh`（Terraform）  
5) `smoke.sh`（readiness → `/encode` → `/decode`）  

実行（対話）
`bash scripts/deploy/with_aws.sh -- bash scripts/deploy/deploy.sh`

## 3. 手動手順（参考: 低レベル操作）
### 3.1 レイヤー作成（Docker不要を優先）
`bash scripts/deploy/build_layer.sh --arch x86_64`

### 3.2 tfvars（例）
`infra/terraform/dev.auto.tfvars`（例）

`aws_region = "ap-northeast-1"`
`architecture = "x86_64"`
`function_name = "scanforge-api"`
`alias_name = "prod"`
`layer_zip_path = "build/scanforge-layer.zip"`
`existing_layer_arn = ""`
`enable_snapstart = true`
`cors_allow_origins = ["*"]`

### 3.3 Terraform 実行
`cd infra/terraform`
`terraform init`
`terraform plan -var-file=dev.auto.tfvars`
`terraform apply -var-file=dev.auto.tfvars`

## 4. 動作確認（スモーク）
`bash scripts/deploy/with_aws.sh -- bash scripts/deploy/smoke.sh`

## 5. 片付け（destroy）
`bash scripts/deploy/with_aws.sh -- bash scripts/deploy/destroy.sh`

- Terraform 管理の全リソースを削除します。
- 実行前に確認が入ります。既定は N です。`--yes` 指定時のみ無人で実行します。
  - 案内行: 「destroy の前に確認します（既定: N）」
  - 本プロンプト: 「destroy を実行しますか？ [y/N]」

無人化（注意: 破壊的）
`bash scripts/deploy/with_aws.sh -- bash scripts/deploy/destroy.sh --yes`

## 6. トラブルシュート（要点）
- `pip install` で wheel が見つからない
  - `lambda/requirements.txt` の依存（特に `zxing-cpp`）と、`--arch` の組み合わせを確認してください。
- `terraform` の認証エラー
  - `deploy.sh` は認証しません。必ず `with_aws.sh` 経由で実行してください。
- `smoke.sh` が Function URL を取得できない
  - `terraform apply` 済みか、`infra/terraform` の outputs を確認してください（`bash scripts/deploy/tf_outputs.sh`）。

## 7. 参考
- 仕様: `docs/SPEC.md`
- Terraform 詳細: `infra/terraform/README.md`
