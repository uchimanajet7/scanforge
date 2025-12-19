# ローカル開発セットアップ（macOS / Linux）

本書は、CI と同じチェック（ShellCheck, Terraform fmt/validate）をローカルで再現し、環境差や部分最適を排除するための最短セットアップを示します（SSOT）。

## 対象
- macOS / Linux（WSL 含む）
- Docker は不要（任意）

## 1) 必須ツールのインストール（例: macOS/Homebrew）
ShellCheck:
`brew install shellcheck`

Terraform:
`brew tap hashicorp/tap`
`brew install hashicorp/tap/terraform`

任意（デプロイや補助で利用）:
`brew install awscli jq`

## 2) バージョン確認
`bash scripts/tools/check_versions.sh`

## 3) CI と同じチェックをローカルで実行
Shell/Bash（警告もエラー扱い = CI と同条件）
`bash scripts/tools/lint_shell.sh --strict`

Terraform（整形の確認）
`bash scripts/tools/fmt_terraform.sh --check`

Terraform（init(-backend=false) → validate）
`bash scripts/tools/fmt_terraform.sh --validate`

整形の自動適用（必要時のみ）
`bash scripts/tools/fmt_terraform.sh --write`

## 4) よくあるつまずき
- 「shellcheck not found」
  - 対処: `brew install shellcheck` 等で導入
- Terraform validate で認証が必要？
  - `--validate` は `-backend=false` のため、基本は AWS 認証不要です（ただし provider の解決にネットワークが必要です）。

## 5) 参考
- デプロイ/スモーク: `docs/GETTING_STARTED.md`, `docs/DEPLOY.md`
- バージョン運用: `docs/VERSIONS.md`

