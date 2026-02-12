#!/usr/bin/env bash
# Terraform fmt と validate のラッパー。ローカルと継続的インテグレーションで共通利用する。
# 用途:
#   - 整形適用: bash scripts/tools/fmt_terraform.sh --write
#   - 整形確認: bash scripts/tools/fmt_terraform.sh --check
#   - 検証:     bash scripts/tools/fmt_terraform.sh --validate
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TF_DIR="${ROOT_DIR}/infra/terraform"

if [[ -f "${ROOT_DIR}/scripts/lib/ui.sh" ]]; then
  # shellcheck disable=SC1091
  source "${ROOT_DIR}/scripts/lib/ui.sh"; ui::init || true
  info() { ui::info tf_fmt "$*"; }
  ok()   { ui::ok   tf_fmt "$*"; }
  err()  { ui::err  tf_fmt "$*"; }
else
  info() { printf '[INFO] %s\n' "$*" >&2; }
  ok()   { printf '[ OK ] %s\n' "$*" >&2; }
  err()  { printf '[ERR ] %s\n' "$*" >&2; }
fi

DO_WRITE="false"
DO_CHECK="false"
DO_VALIDATE="false"

usage() {
  cat <<'USAGE'
使い方: bash scripts/tools/fmt_terraform.sh [--write] [--check] [--validate]
  --write     'terraform fmt -recursive' を実行します
  --check     'terraform fmt -check -recursive -diff' を実行します
  --validate  'terraform init -backend=false -input=false' → 'terraform validate -no-color' を実行します
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --write) DO_WRITE="true"; shift ;;
    --check) DO_CHECK="true"; shift ;;
    --validate) DO_VALIDATE="true"; shift ;;
    -h|--help) usage; exit 0 ;;
    *) err "不明な引数: $1"; usage; exit 2 ;;
  esac
done

if ! command -v terraform >/dev/null 2>&1; then
  err "terraform が見つかりません。インストール後に再実行してください。"
  exit 127
fi

cd "$TF_DIR"

if [[ "$DO_WRITE" == "true" ]]; then
  info "terraform fmt -recursive"
  terraform fmt -recursive
  ok "fmt 適用完了"
fi

if [[ "$DO_CHECK" == "true" ]]; then
  info "terraform fmt -check -recursive -diff"
  terraform fmt -check -recursive -diff
  ok "fmt チェック OK"
fi

if [[ "$DO_VALIDATE" == "true" ]]; then
  info "terraform init -backend=false -input=false"
  terraform init -backend=false -input=false
  info "terraform validate -no-color"
  terraform validate -no-color
  ok "validate OK"
fi

if [[ "$DO_WRITE$DO_CHECK$DO_VALIDATE" == "falsefalsefalse" ]]; then
  info "実行内容が指定されていません。--help を参照してください。"
fi
