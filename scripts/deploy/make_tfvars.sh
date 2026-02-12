#!/usr/bin/env bash
# tfvars を非対話で生成する。setup で取得した値を受け取り、必要項目のみを `infra/terraform/dev.auto.tfvars` に出力する。
# 形式の確認には `infra/terraform/dev.auto.tfvars.example` を参照する。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
source "${SCRIPT_DIR}/../lib/ui.sh"; ui::init
ui::debug_fp make_tfvars "$0"

info() { ui::info make_tfvars "$*"; }
err()  { ui::err make_tfvars "$*"; }

REGION=""
ARCH="x86_64"
SNAPSTART="true"
FUNCTION_NAME="scanforge-api"
ALIAS_NAME="prod"
TIMEOUT="15"
MEMORY="512"
TMP_MB="512"
LOG_DAYS="14"
FILE="infra/terraform/dev.auto.tfvars"
YES="false"
LAYER_PATH="build/scanforge-layer.zip"

usage() {
  cat <<USAGE
使い方: bash scripts/deploy/make_tfvars.sh --region <REGION> [オプション]
  --region <REGION>           必須
  --arch <arm64|x86_64>       既定値は x86_64
  --snapstart <true|false>    既定値は true
  --function-name <NAME>      既定値は scanforge-api
  --alias-name <NAME>         既定値は prod
  --timeout <seconds>         既定値は 15
  --memory <mb>               既定値は 512
  --tmp-mb <mb>               既定値は 512
  --log-days <days>           既定値は 14
  --file <PATH>               既定値は infra/terraform/dev.auto.tfvars
  --yes                       上書き確認をスキップ
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --region) REGION="$2"; shift 2;;
    --arch) ARCH="$2"; shift 2;;
    --snapstart) SNAPSTART="$2"; shift 2;;
    --function-name) FUNCTION_NAME="$2"; shift 2;;
    --alias-name) ALIAS_NAME="$2"; shift 2;;
    --timeout) TIMEOUT="$2"; shift 2;;
    --memory) MEMORY="$2"; shift 2;;
    --tmp-mb) TMP_MB="$2"; shift 2;;
    --log-days) LOG_DAYS="$2"; shift 2;;
    --file) FILE="$2"; shift 2;;
    --yes) YES="true"; shift;;
    -h|--help) usage; exit 0;;
    *) err "不明な引数: $1"; usage; exit 1;;
  esac
done

if [[ -z "$REGION" ]]; then
  err "--region は必須です"
  exit 1
fi

OUT="${ROOT_DIR}/${FILE}"
if [[ -f "$OUT" && "$YES" != "true" ]]; then
  ui::ask_yesno __GO make_tfvars "既存 ${FILE} を上書きしますか？" N
  if [[ "${__GO}" != "true" ]]; then
    info "上書きを中止しました"
    exit 0
  fi
fi

ORIGINS_LINE='cors_allow_origins = ["*"]'

mkdir -p "$(dirname "$OUT")"
cat >"$OUT" <<EOF
aws_region        = "${REGION}"
function_name     = "${FUNCTION_NAME}"
alias_name        = "${ALIAS_NAME}"
architecture      = "${ARCH}"
lambda_timeout_seconds = ${TIMEOUT}
lambda_memory_mb  = ${MEMORY}
lambda_tmp_mb     = ${TMP_MB}
log_retention_days = ${LOG_DAYS}
enable_snapstart   = ${SNAPSTART}
layer_zip_path     = "${LAYER_PATH}"
existing_layer_arn = ""
${ORIGINS_LINE}
EOF

info "tfvars を生成しました: ${FILE}"
