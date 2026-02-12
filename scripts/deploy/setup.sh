#!/usr/bin/env bash
# デプロイ設定の入力。必要項目のみを対話で収集し、__OUT_* を返します。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/../lib/ui.sh"; ui::init
ui::debug_fp setup "$0"

# 開始/終了タイムスタンプ
START_TS=$(ui::ts)
START_MS=$(ui::epoch_ms)
ui::info setup "----- start: ${START_TS} -----"
__af_end() {
  local __end_ms
  __end_ms="$(ui::epoch_ms)"
  local __diff
  __diff=$((__end_ms-START_MS))
  ui::info setup "----- end: $(ui::ts) (elapsed=$(ui::fmt_elapsed_ms "${__diff}")) -----"
}
trap __af_end EXIT

BASE_PROFILE=""
REGION=""
usage() {
  cat <<USAGE
使い方: bash scripts/deploy/setup.sh [--base-profile NAME] [--region REGION]
  region / arch / apply_yes を対話で収集し、__OUT_* を標準出力に返します。
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base-profile) BASE_PROFILE="$2"; shift 2;;
    --region) REGION="$2"; shift 2;;
    -h|--help) usage; exit 0;;
    *) ui::err setup "不明な引数: $1"; usage; exit 1;;
  esac
done

ui::hdr setup "設定入力(setup)"

# 既定リージョンの算出。base-profile を優先します。
DEFAULT_REGION=""
if [[ -n "$BASE_PROFILE" ]]; then
  set +e; DEFAULT_REGION=$(aws configure get region --profile "$BASE_PROFILE" 2>/dev/null); set -e
fi
if [[ -z "$DEFAULT_REGION" ]]; then
  set +e; DEFAULT_REGION=$(aws configure get region 2>/dev/null); set -e
fi

# 既定値
DEFAULT_ARCH="x86_64"
DEFAULT_SNAPSTART="true"
DEFAULT_APPLY_YES="false"

# 入力収集。確認付きです。
if [[ -n "$REGION" ]]; then
  ui::info setup "AWSリージョン。指定済みです: ${REGION}"
elif [[ -n "$DEFAULT_REGION" ]]; then
  ui::info setup "既定: リージョン=${DEFAULT_REGION}。Enter で採用します。"
  ui::ask_silent REGION setup "AWSリージョン" "$DEFAULT_REGION"
else
  ui::ask REGION setup "AWSリージョン。例: us-west-2" ""
fi

ui::info setup "既定: アーキテクチャ=${DEFAULT_ARCH}。Enter で採用します。"
ui::ask_silent ARCH setup "アーキテクチャ。arm64|x86_64" "$DEFAULT_ARCH"

APPLY_YES_UPPER="$(printf '%s' "${DEFAULT_APPLY_YES}" | tr '[:lower:]' '[:upper:]')"
ui::info setup "自動承諾を有効にする前に確認します。既定: N。"
ui::ask_yesno APPLY_YES setup "terraform apply を自動承諾しますか？" "${APPLY_YES_UPPER}"

SNAPSTART="${DEFAULT_SNAPSTART}"
LAYER_PATH="build/scanforge-layer.zip"
CORS="*"

# バリデーション
case "$ARCH" in arm64|x86_64) :;; *) ui::err setup "arch は arm64 か x86_64 を指定してください"; exit 1;; esac
if [[ -z "$REGION" ]]; then ui::err setup "AWSリージョンは必須です"; exit 1; fi

# 確定出力
ui::ok setup "確定: region=${REGION} arch=${ARCH} snapstart=${SNAPSTART} apply_yes=${APPLY_YES}"
printf '__OUT_REGION=%s\n' "${REGION}"
printf '__OUT_ARCH=%s\n' "${ARCH}"
printf '__OUT_LAYER=%s\n' "${LAYER_PATH}"
printf '__OUT_SNAPSTART=%s\n' "${SNAPSTART}"
printf '__OUT_APPLY_YES=%s\n' "${APPLY_YES}"
printf '__OUT_CORS=%s\n' "${CORS}"
