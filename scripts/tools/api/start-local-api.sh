#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# ローカル API 起動ラッパー
# - 通常: venv セットアップ → ローカル API サーバーをフォアグラウンドで起動
# - --auto: 起動→ready確認→スモーク→停止。完全自動です。
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

source "${SCRIPT_DIR}/../../lib/ui.sh"
ui::init
LOG_TAG="api-auto"

fail() {
  ui::err "${LOG_TAG}" "$1"
  exit 1
}

usage() {
  cat <<USAGE
使い方:
  ./scripts/tools/api/start-local-api.sh
  ./scripts/tools/api/start-local-api.sh --auto

説明:
  --auto は「起動→ready確認→/encode→/decode スモーク→停止」までを 1 回で、プロンプトなしで実行します。
  既存プロセスが同一ポートを待受している場合は、--auto は確認なしで停止して続行します。通常実行は停止の確認を行い、必要に応じて SIGKILL の確認も行います。
USAGE
}

AUTO_MODE=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --auto) AUTO_MODE=1; shift;;
    -h|--help) usage; exit 0;;
    *) fail "不明な引数: $1";;
  esac
done

API_HOST="${API_HOST:-127.0.0.1}"
API_PORT="${API_PORT:-8001}"

"${SCRIPT_DIR}/setup-venv.sh"

if [[ ${AUTO_MODE} -ne 1 ]]; then
  exec "${SCRIPT_DIR}/run-api.sh"
fi

command -v curl >/dev/null 2>&1 || fail "curl が見つかりません。事前にインストールしてください。"

RUN_WRAPPER_PID=""
SERVER_STOPPED=0

stop_server() {
  if [[ ${SERVER_STOPPED} -eq 1 ]]; then
    return 0
  fi
  SERVER_STOPPED=1

  if [[ -z "${RUN_WRAPPER_PID}" ]]; then
    return 0
  fi
  if ! kill -0 "${RUN_WRAPPER_PID}" 2>/dev/null; then
    return 0
  fi

  ui::info "${LOG_TAG}" "ローカル アプリケーション プログラミング インターフェース を停止します。プロセス識別子は ${RUN_WRAPPER_PID} です。"
  kill -TERM "${RUN_WRAPPER_PID}" 2>/dev/null || true

  local loops=0
  while kill -0 "${RUN_WRAPPER_PID}" 2>/dev/null; do
    ((loops++))
    if (( loops > 20 )); then
      ui::warn "${LOG_TAG}" "停止が完了しないため強制終了を試みます。プロセス識別子は ${RUN_WRAPPER_PID} です。"
      kill -KILL "${RUN_WRAPPER_PID}" 2>/dev/null || true
      break
    fi
    sleep 0.25
  done

  wait "${RUN_WRAPPER_PID}" 2>/dev/null || true
}

trap 'stop_server' EXIT INT TERM

ui::hdr "${LOG_TAG}" "auto モード"
ui::info "${LOG_TAG}" "起動します: http://${API_HOST}:${API_PORT}/"

API_ASSUME_YES=1 API_FORCE_KILL=1 API_HOST="${API_HOST}" API_PORT="${API_PORT}" "${SCRIPT_DIR}/run-api.sh" &
RUN_WRAPPER_PID=$!

wait_for_ready() {
  local loops=0
  local url="http://${API_HOST}:${API_PORT}/"
  while true; do
    ((loops++))

    if ! kill -0 "${RUN_WRAPPER_PID}" 2>/dev/null; then
      wait "${RUN_WRAPPER_PID}" 2>/dev/null || true
      fail "起動プロセスが終了しました。起動に失敗しています。"
    fi

    local code
    code="$(curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 1 --max-time 1 "${url}" 2>/dev/null || true)"
    if [[ -n "${code}" && "${code}" != "000" ]]; then
      ui::ok "${LOG_TAG}" "準備完了: ${url}。状態は ${code} です。"
      return 0
    fi

    if (( loops > 100 )); then
      ui::warn "${LOG_TAG}" "準備完了の確認がタイムアウトしました。10 秒で打ち切り、続行します。"
      return 0
    fi

    sleep 0.1
  done
}

wait_for_ready

ui::info "${LOG_TAG}" "スモークを実行します: ./scripts/tools/api/smoke-api.sh"
set +e
API_HOST="${API_HOST}" API_PORT="${API_PORT}" "${SCRIPT_DIR}/smoke-api.sh"
SMOKE_RC=$?
set -e

if [[ ${SMOKE_RC} -eq 0 ]]; then
  ui::ok "${LOG_TAG}" "スモーク: OK"
else
  ui::err "${LOG_TAG}" "スモーク: 失敗。戻り値は ${SMOKE_RC} です。"
fi

stop_server
trap - EXIT INT TERM

exit "${SMOKE_RC}"
