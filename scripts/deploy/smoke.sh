#!/usr/bin/env bash
# Function URL 経由で /encode /decode をスモークします。readiness 待ちとタイムアウト設定を含みます。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
source "${SCRIPT_DIR}/../lib/ui.sh"; ui::init
ui::debug_fp smoke "$0"

# 開始/終了タイムスタンプ
START_TS=$(ui::ts)
START_MS=$(ui::epoch_ms)
ui::info smoke "----- start: ${START_TS} -----"
__af_end() {
  local __end_ms
  __end_ms="$(ui::epoch_ms)"
  local __diff
  __diff=$((__end_ms-START_MS))
  ui::info smoke "----- end: $(ui::ts) (elapsed=$(ui::fmt_elapsed_ms "${__diff}")) -----"
}
trap __af_end EXIT

# デフォルト値。環境変数で上書きできます。
SMOKE_TIMEOUT_FUNC="${SMOKE_TIMEOUT_FUNC:-25}"  # POST /encode の最大秒
SMOKE_READY_WAIT_SECONDS="${SMOKE_READY_WAIT_SECONDS:-90}" # Function URL readiness 待ち
EXPECTED_TEXT="SCANFORGE"

usage() {
  cat <<USAGE
使い方: bash scripts/deploy/smoke.sh
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage; exit 0;;
    *) ui::err smoke "不明な引数: $1"; usage; exit 1;;
  esac
done

cd "${ROOT_DIR}/infra/terraform"
set +e
URL=$(terraform output -raw function_url 2>/dev/null)
RC=$?
set -e
if [[ $RC -ne 0 || -z "${URL:-}" || ! "$URL" =~ ^https?:// ]]; then
  ui::err smoke "Function URL を取得できません。terraform outputs に function_url がありません。"
  ui::info smoke "デプロイ手順: bash scripts/deploy/with_aws.sh -- bash scripts/deploy/deploy.sh"
  exit 2
fi
ui::info smoke "Function URL: ${URL}"
BASE_URL="${URL%/}"

# Readiness プローブ: GET /encode でHTTP応答が得られるまで待機します。status 200/400/404/415/422 を ready とみなします。
if [[ ${SMOKE_READY_WAIT_SECONDS} -gt 0 ]]; then
  ui::info smoke "0) readiness: GET /encode の到達性を確認。最長 ${SMOKE_READY_WAIT_SECONDS}s"
  ui::run smoke "GET:"
  printf "  %s\n" "curl -sS -o /dev/null -w \"%{http_code}\" --connect-timeout 3 --max-time 4 \"${BASE_URL}/encode\"" >&2
  printf "  %s\n" "${BASE_URL}/encode" >&2
  READY_OK=0
  for ((i=1; i<=SMOKE_READY_WAIT_SECONDS; i++)); do
    set +e
    RC_CODE=$(curl -sS -o /dev/null -w "%{http_code}" --connect-timeout 3 --max-time 4 "${BASE_URL}/encode")
    set -e
    case "$RC_CODE" in
      200|400|404|415|422)
        ui::ok smoke "準備完了。状態コードは ${RC_CODE}、経過は ${i} 秒です。"
        READY_OK=1
        break
        ;;
    esac
    if (( i % 15 == 0 )); then
      REM=$(( SMOKE_READY_WAIT_SECONDS - i ))
      ui::info smoke "readiness待機中: 経過 ${i}s / ${SMOKE_READY_WAIT_SECONDS}s。残り ${REM}s。最後の応答: ${RC_CODE:--}"
    fi
    sleep 1
  done
  if [[ $READY_OK -eq 0 ]]; then
    ui::warn smoke "readiness確認がタイムアウトしました。続行します。"
  fi
fi

# /encode: SVG を生成し、そのまま /decode へ data URI で渡して往復検証
ENCODE_PAYLOAD="{\"text\":\"${EXPECTED_TEXT}\",\"format\":\"qrcode\",\"output\":\"svg\"}"
POST_CMD="curl -sS --connect-timeout 5 --max-time \"${SMOKE_TIMEOUT_FUNC}\" -w '\\n%{http_code}' -X POST -H 'Content-Type: application/json' -d '${ENCODE_PAYLOAD}' \"${BASE_URL}/encode\""
ui::info smoke "1) POST /encode で QR (SVG) を生成"
ui::run smoke "POST:"
printf "  %s\n" "${POST_CMD}" >&2
printf "  %s\n" "${BASE_URL}/encode" >&2
RESP=$(eval "${POST_CMD}") || true
STATUS=$(printf '%s' "${RESP}" | tail -n1)
BODY=$(printf '%s' "${RESP}" | sed '$d' || true)
ui::ok smoke "response (encode, status=${STATUS}):"
echo "${BODY}" | jq . >&2

if [[ "${STATUS}" != "200" ]]; then
  ui::err smoke "POST /encode に失敗 (status=${STATUS})"
  exit 1
fi

ENCODE_FORMAT=$(printf '%s' "${BODY}" | jq -r '.format // empty' 2>/dev/null || true)
if [[ "${ENCODE_FORMAT}" != "svg" ]]; then
  ui::err smoke "encode の format が期待値と異なります (expected=svg actual=${ENCODE_FORMAT:-})"
  exit 1
fi

SVG_CONTENT=$(printf '%s' "${BODY}" | jq -r '.content // empty')
if [[ -z "${SVG_CONTENT}" || "${SVG_CONTENT}" == "null" ]]; then
  ui::err smoke "SVG content を取得できませんでした"
  exit 1
fi
if ! printf '%s' "${SVG_CONTENT}" | grep -q "<svg"; then
  ui::err smoke "SVG content が不正です。<svg が見つかりません。"
  exit 1
fi
DATA_URI=$(printf 'data:image/svg+xml;base64,%s' "$(printf '%s' "${SVG_CONTENT}" | base64 | tr -d '\n')")

# /decode は data URI を必須とし、barcodeFormat=svg を明示
DECODE_PAYLOAD=$(cat <<EOF
{"barcodeData":"${DATA_URI}","barcodeFormat":"svg"}
EOF
)
DECODE_CMD="curl -sS --connect-timeout 5 --max-time \"${SMOKE_TIMEOUT_FUNC}\" -w '\\n%{http_code}' -X POST -H 'Content-Type: application/json' -d '${DECODE_PAYLOAD}' \"${BASE_URL}/decode\""
ui::info smoke "2) POST /decode に barcodeData (SVG data URI) を渡して往復確認"
ui::run smoke "POST:"
printf "  %s\n" "${DECODE_CMD}" >&2
printf "  %s\n" "${BASE_URL}/decode" >&2
RESP_DEC=$(eval "${DECODE_CMD}") || true
STATUS_DEC=$(printf '%s' "${RESP_DEC}" | tail -n1)
BODY_DEC=$(printf '%s' "${RESP_DEC}" | sed '$d' || true)
ui::ok smoke "response (decode, status=${STATUS_DEC}):"
echo "${BODY_DEC}" | jq . >&2

if [[ "${STATUS_DEC}" != "200" ]]; then
  ui::err smoke "POST /decode に失敗 (status=${STATUS_DEC})"
  exit 1
fi

# decode結果に期待テキストが含まれることを確認
FOUND=$(printf '%s' "${BODY_DEC}" | jq -r --arg t "${EXPECTED_TEXT}" 'any(.results[]?; .text == $t)')
if [[ "${FOUND}" != "true" ]]; then
  ui::err smoke "decode 結果に期待値が含まれませんでした。期待: ${EXPECTED_TEXT}。"
  exit 1
fi

ui::ok smoke "OK (decoded=${EXPECTED_TEXT})"
ui::ok smoke "スモーク成功"
