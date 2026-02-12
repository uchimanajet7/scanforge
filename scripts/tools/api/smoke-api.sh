#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# ローカルのアプリケーションプログラミングインターフェースで /encode → /decode をスモークする。実行コマンド、HTTP 応答の状態コード、応答 JSON、検証結果を出力する。
# - /encode で生成した SVG を data URI 化し、/decode へ渡して往復確認する
# - 実行コマンド・HTTP status・応答 JSON・検証結果をログへ出力する
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

source "${SCRIPT_DIR}/../../lib/ui.sh"
ui::init
LOG_TAG="api-smoke"

fail() {
  ui::err "${LOG_TAG}" "$1"
  exit 1
}

ui::debug_fp "${LOG_TAG}" "$0"

# 開始と終了のタイムスタンプを記録し、`ui::ts` と経過時間表示で「いつ」「どれだけ」を追跡できる形式にする。
START_TS="$(ui::ts)"
START_MS="$(ui::epoch_ms)"
ui::info "${LOG_TAG}" "----- start: ${START_TS} -----"
__end() {
  local __end_ms __diff
  __end_ms="$(ui::epoch_ms)"
  __diff=$((__end_ms-START_MS))
  ui::info "${LOG_TAG}" "----- end: $(ui::ts) (elapsed=$(ui::fmt_elapsed_ms "${__diff}")) -----"
}
trap __end EXIT

API_HOST="${API_HOST:-127.0.0.1}"
API_PORT="${API_PORT:-8001}"
BASE_URL="${API_BASE_URL:-http://${API_HOST}:${API_PORT}}"
TIMEOUT_SEC="${API_SMOKE_TIMEOUT_SEC:-25}"

command -v curl >/dev/null 2>&1 || fail "curl が見つかりません。事前にインストールしてください。"
command -v base64 >/dev/null 2>&1 || fail "base64 が見つかりません。事前にインストールしてください。"
command -v jq >/dev/null 2>&1 || fail "jq が見つかりません。事前にインストールしてください。"

BASE_URL="${BASE_URL%/}"
ui::info "${LOG_TAG}" "Base URL: ${BASE_URL}"

# レディネス: /encode への取得要求でハイパーテキスト転送プロトコルの応答が得られるか確認する。状態コード 200/400/404/415/422 は準備完了とみなす。
ui::info "${LOG_TAG}" "0) readiness: GET /encode の到達性を確認"
ui::run "${LOG_TAG}" "GET:"
printf "  %s\n" "curl -sS -o /dev/null -w \"%{http_code}\" --connect-timeout 3 --max-time 4 \"${BASE_URL}/encode\"" >&2
printf "  %s\n" "${BASE_URL}/encode" >&2
set +e
RC_CODE="$(curl -sS -o /dev/null -w "%{http_code}" --connect-timeout 3 --max-time 4 "${BASE_URL}/encode")"
RC_CURL=$?
set -e
if [[ ${RC_CURL} -ne 0 ]]; then
  fail "レディネス確認に失敗しました。curl の終了コードは ${RC_CURL} です。ローカルのアプリケーションプログラミングインターフェースが起動しているか確認してください。"
fi
case "${RC_CODE}" in
  200|400|404|415|422)
    ui::ok "${LOG_TAG}" "準備完了。状態コードは ${RC_CODE} です。"
    ;;
  *)
    ui::warn "${LOG_TAG}" "レディネス: 想定外の状態コードです: ${RC_CODE}。続行します。"
    ;;
esac

ENCODE_PAYLOAD='{"text":"SCANFORGE","format":"qrcode","output":"svg"}'
ENCODE_CMD="curl -sS --connect-timeout 5 --max-time \"${TIMEOUT_SEC}\" -w '\\n%{http_code}' -X POST -H 'Content-Type: application/json' -d '${ENCODE_PAYLOAD}' \"${BASE_URL}/encode\""
ui::info "${LOG_TAG}" "1) /encode へ送信してクイックレスポンスコードをスケーラブルベクターグラフィックス形式で生成"
ui::run "${LOG_TAG}" "POST:"
printf "  %s\n" "${ENCODE_CMD}" >&2
printf "  %s\n" "${BASE_URL}/encode" >&2
RESP="$(eval "${ENCODE_CMD}")" || true
STATUS="$(printf '%s' "${RESP}" | tail -n1)"
BODY="$(printf '%s' "${RESP}" | sed '$d' || true)"
ui::ok "${LOG_TAG}" "応答: /encode の状態コードは ${STATUS} です。"
echo "${BODY}" | jq . >&2

if [[ "${STATUS}" != "200" ]]; then
  fail "POST /encode が失敗しました。状態コードは ${STATUS} です。"
fi

SVG_CONTENT="$(printf '%s' "${BODY}" | jq -r '.content // empty')"
if [[ -z "${SVG_CONTENT}" || "${SVG_CONTENT}" == "null" ]]; then
  fail "SVG の内容を取得できませんでした。"
fi

SVG_B64="$(printf '%s' "${SVG_CONTENT}" | base64 | tr -d '\n')"
DATA_URI="data:image/svg+xml;base64,${SVG_B64}"

DECODE_PAYLOAD=$(cat <<EOF
{"barcodeData":"${DATA_URI}","barcodeFormat":"svg"}
EOF
)

DECODE_CMD="curl -sS --connect-timeout 5 --max-time \"${TIMEOUT_SEC}\" -w '\\n%{http_code}' -X POST -H 'Content-Type: application/json' -d '${DECODE_PAYLOAD}' \"${BASE_URL}/decode\""
ui::info "${LOG_TAG}" "2) POST /decode に barcodeData として SVG の data URI を渡して往復確認"
ui::run "${LOG_TAG}" "POST:"
printf "  %s\n" "${DECODE_CMD}" >&2
printf "  %s\n" "${BASE_URL}/decode" >&2
RESP_DEC="$(eval "${DECODE_CMD}")" || true
STATUS_DEC="$(printf '%s' "${RESP_DEC}" | tail -n1)"
BODY_DEC="$(printf '%s' "${RESP_DEC}" | sed '$d' || true)"
ui::ok "${LOG_TAG}" "応答: /decode の状態コードは ${STATUS_DEC} です。"
echo "${BODY_DEC}" | jq . >&2

if [[ "${STATUS_DEC}" != "200" ]]; then
  fail "POST /decode が失敗しました。状態コードは ${STATUS_DEC} です。"
fi

ui::info "${LOG_TAG}" "3) 検証: /decode の結果に SCANFORGE が含まれることを確認"
set +e
printf '%s' "${BODY_DEC}" | jq -e '.results[]? | select(.text == "SCANFORGE")' >/dev/null
FOUND_RC=$?
set -e
if [[ ${FOUND_RC} -ne 0 ]]; then
  fail "往復確認に失敗しました。SCANFORGE が検出結果に存在しません。"
fi

ui::ok "${LOG_TAG}" "ローカル API のスモークが完了しました。/encode から /decode までの往復に成功しました。"
