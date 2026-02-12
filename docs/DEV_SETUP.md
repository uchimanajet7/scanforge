# ローカル開発セットアップ: macOS / Linux

本書は、継続的インテグレーションと同じチェックをローカルで再現し、環境差や部分最適を排除するための最短セットアップを示します。対象: ShellCheck / Terraform fmt / Terraform validate。

## 対象
- macOS / Linux。

## 1) 必須ツールのインストール: 例: macOS/Homebrew
ShellCheck:
`brew install shellcheck`

Terraform:
`brew tap hashicorp/tap`
`brew install hashicorp/tap/terraform`

任意: デプロイや補助で利用
`brew install awscli jq`

## 2) バージョン確認
`bash scripts/tools/check_versions.sh`

## 3) 継続的インテグレーションと同じチェックをローカルで実行
Shell/Bash: 警告もエラー扱い。継続的インテグレーションと同条件。
`bash scripts/tools/lint_shell.sh --strict`

Terraform: 整形の確認
`bash scripts/tools/fmt_terraform.sh --check`

Terraform: init を `-backend=false` で実行 → validate
`bash scripts/tools/fmt_terraform.sh --validate`

整形の自動適用: 必要時のみ
`bash scripts/tools/fmt_terraform.sh --write`

## 4) よくあるつまずき
- 「shellcheck not found」
  - 対処: `brew install shellcheck` 等で導入
- Terraform validate の前提条件
  - `--validate` は `terraform init -backend=false -input=false` → `terraform validate -no-color` を実行します。provider の解決にネットワークが必要です。

## 5) 参考
- デプロイ/スモーク: `docs/GETTING_STARTED.md`, `docs/DEPLOY.md`
- バージョン運用: `docs/VERSIONS.md`
