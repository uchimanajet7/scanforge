#!/usr/bin/env bash
# デプロイ一括実行。setup → layer → tfvars → init → plan → apply → smoke の順に実行します。
# 認証は with_aws.sh で付与する前提。setup→build_layer→make_tfvars→tf_init→tf_plan→tf_apply→smoke を順に実行する。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
source "${SCRIPT_DIR}/../lib/ui.sh"; ui::init
ui::debug_fp deploy "$0"
[[ "${DEPLOY_DEBUG:-}" == "1" ]] && set -x

info() { ui::info deploy "$*"; }
hdr()  { ui::hdr deploy "$*"; }
err()  { ui::err deploy "$*"; }

REGION_INPUT=""

usage() {
  cat <<USAGE
使い方: bash scripts/deploy/deploy.sh [--region REGION]
  --region : AWSリージョン。任意です。指定時は setup のリージョン入力を省略します。
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --region) REGION_INPUT="$2"; shift 2;;
    -h|--help) usage; exit 0;;
    *) err "不明な引数: $1"; usage; exit 1;;
  esac
done

START_TS=$(ui::ts)
START_MS=$(ui::epoch_ms)
info "----- start: ${START_TS} -----"

# 認証チェック
if [[ -z "${AWS_PROFILE-}" && ( -z "${AWS_ACCESS_KEY_ID-}" || -z "${AWS_SESSION_TOKEN-}" ) ]]; then
  hdr "前提エラー: 認証が未注入です。with_aws.sh 経由で実行してください。"
  ui::err deploy "例: bash scripts/deploy/with_aws.sh --mode profile --profile <WORK_PROFILE> -- bash scripts/deploy/deploy.sh"
  exit 1
fi

# 1) 設定入力
hdr "設定入力(setup)"
TMP_SETUP=$(mktemp)
bash "${SCRIPT_DIR}/setup.sh" ${REGION_INPUT:+--region "$REGION_INPUT"} | tee "$TMP_SETUP"
REGION=$(grep -E '^__OUT_REGION=' "$TMP_SETUP" | tail -n1 | cut -d= -f2- || true)
ARCH=$(grep -E '^__OUT_ARCH=' "$TMP_SETUP" | tail -n1 | cut -d= -f2- || true)
SNAPSTART=$(grep -E '^__OUT_SNAPSTART=' "$TMP_SETUP" | tail -n1 | cut -d= -f2- || echo "true")
APPLY_YES=$(grep -E '^__OUT_APPLY_YES=' "$TMP_SETUP" | tail -n1 | cut -d= -f2- || echo "false")
rm -f "$TMP_SETUP"

# 2) レイヤー作成
hdr "依存レイヤー作成(build_layer)"
BL_ARGS=()
[[ -n "$ARCH" ]] && BL_ARGS+=(--arch "$ARCH")
RUN_BL_ARGS="${BL_ARGS[*]-}"
ui::run deploy "build_layer.sh:"
if (( ${#BL_ARGS[@]} )); then
  printf "  %s\n" "bash ${SCRIPT_DIR}/build_layer.sh ${RUN_BL_ARGS}" >&2
  bash "${SCRIPT_DIR}/build_layer.sh" "${BL_ARGS[@]}"
else
  printf "  %s\n" "bash ${SCRIPT_DIR}/build_layer.sh" >&2
  bash "${SCRIPT_DIR}/build_layer.sh"
fi

# 3) tfvars 生成
hdr "tfvars 生成(make_tfvars)"
MT_ARGS=(--region "${REGION}" --arch "${ARCH}" --snapstart "${SNAPSTART}" --yes)
RUN_MT_ARGS="${MT_ARGS[*]-}"
ui::run deploy "make_tfvars.sh:"
printf "  %s\n" "bash ${SCRIPT_DIR}/make_tfvars.sh ${RUN_MT_ARGS}" >&2
bash "${SCRIPT_DIR}/make_tfvars.sh" "${MT_ARGS[@]}"

# 4) terraform init
hdr "Terraform init"
ui::run deploy "tf_init.sh:"
printf "  %s\n" "bash ${SCRIPT_DIR}/tf_init.sh" >&2
bash "${SCRIPT_DIR}/tf_init.sh"

# 5) terraform plan
hdr "Terraform plan"
ui::run deploy "tf_plan.sh:"
printf "  %s\n" "bash ${SCRIPT_DIR}/tf_plan.sh" >&2
bash "${SCRIPT_DIR}/tf_plan.sh"

# 6) terraform apply。確認付きです。apply_yes で無人化します。
hdr "Terraform apply"
TA_ARGS=()
AUTO_APPLY="false"
if [[ "${APPLY_YES}" == "true" ]]; then
  AUTO_APPLY="true"
fi

if [[ "${AUTO_APPLY}" != "true" ]]; then
  ui::info deploy "plan の内容を apply する前に確認します。既定: N。"
  ui::ask_yesno __GO deploy "plan の内容を apply しますか？" N
  if [[ "${__GO}" != "true" ]]; then
    ui::info deploy "apply をスキップしました。正常終了です。再適用は以下を参照してください。"
    ui::run  deploy "tf_apply.sh:"
    printf "  %s\n" "bash ${SCRIPT_DIR}/tf_apply.sh --yes" >&2
    END_MS=$(ui::epoch_ms); DIFF_MS=$((END_MS-START_MS))
    info "----- end: $(ui::ts) (elapsed=$(ui::fmt_elapsed_ms "${DIFF_MS}")) -----"
    exit 0
  fi
  TA_ARGS+=(--yes)
else
  TA_ARGS+=(--yes)
fi

RUN_TA_ARGS="${TA_ARGS[*]-}"
ui::run deploy "tf_apply.sh:"
if (( ${#TA_ARGS[@]} )); then
  printf "  %s\n" "bash ${SCRIPT_DIR}/tf_apply.sh ${RUN_TA_ARGS}" >&2
else
  printf "  %s\n" "bash ${SCRIPT_DIR}/tf_apply.sh" >&2
fi
bash "${SCRIPT_DIR}/tf_apply.sh" "${TA_ARGS[@]}"

# 7) スモーク
hdr "スモーク(smoke)"
ui::run deploy "smoke.sh:"
printf "  %s\n" "bash ${SCRIPT_DIR}/smoke.sh" >&2
bash "${SCRIPT_DIR}/smoke.sh"

END_MS=$(ui::epoch_ms)
DIFF_MS=$((END_MS-START_MS))
info "----- end: $(ui::ts) (elapsed=$(ui::fmt_elapsed_ms "${DIFF_MS}")) -----"
