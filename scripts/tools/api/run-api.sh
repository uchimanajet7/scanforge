#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# ローカル API サーバー起動。
# - lambda/handler.py を HTTP API として起動する。
# - /encode /decode をローカルでテスト確認するための簡易サーバー
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

# 共通 UI ライブラリを読み込み、既存ツールと統一されたログ書式を用いる。
source "${SCRIPT_DIR}/../../lib/ui.sh"
ui::init
LOG_TAG="api"

SCRIPT_SECTION_OPEN=0
SCRIPT_START_MS=""
SERVER_PID=""
SIGNAL_ATTEMPTS=0
FORCE_KILL_FLAG="${API_FORCE_KILL:-}"
ASSUME_YES_FLAG="${API_ASSUME_YES:-}"

log_info() { ui::info "${LOG_TAG}" "$1"; }
log_warn() { ui::warn "${LOG_TAG}" "$1"; }
fail() {
  ui::err "${LOG_TAG}" "$1"
  exit 1
}

is_force_kill_enabled() {
  case "${FORCE_KILL_FLAG}" in
    1|true|TRUE|True|yes|YES) return 0 ;;
    *) return 1 ;;
  esac
}

is_assume_yes_enabled() {
  case "${ASSUME_YES_FLAG}" in
    1|true|TRUE|True|yes|YES) return 0 ;;
    *) return 1 ;;
  esac
}

script_exit_trap() {
  local rc=$?
  trap - EXIT
  if [[ $SCRIPT_SECTION_OPEN -eq 1 ]]; then
    ui::section_end "${LOG_TAG}" "${SCRIPT_START_MS}"
    SCRIPT_SECTION_OPEN=0
  fi
  exit $rc
}

ui::section_start SCRIPT_START_MS "${LOG_TAG}" "start"
SCRIPT_SECTION_OPEN=1
trap 'script_exit_trap' EXIT

command -v lsof >/dev/null 2>&1 || fail "lsof が見つかりません。事前にインストールしてください。"

API_HOST="${API_HOST:-127.0.0.1}"
API_PORT="${API_PORT:-8001}"

TOOLS_DIR="${REPO_ROOT}/tools/api"
VENV_DIR="${TOOLS_DIR}/.venv"
VENV_PY="${VENV_DIR}/bin/python"

if [[ ! -x "${VENV_PY}" ]]; then
  fail "venv が未作成です。先に ./scripts/tools/api/setup-venv.sh か start-local-api.sh を実行してください。"
fi

terminate_conflicts() {
  local -a watching=("$@")
  if ((${#watching[@]} == 0)); then
    return 0
  fi

  ui::warn "${LOG_TAG}" "SIGTERM を送信します: ${watching[*]}"
  local pid
  for pid in "${watching[@]}"; do
    kill -TERM "$pid" 2>/dev/null || true
  done

  local pid_wait
  for pid_wait in "${watching[@]}"; do
    local loops=0
    while kill -0 "$pid_wait" 2>/dev/null; do
      ((loops++))
      if (( loops > 20 )); then
        break
      fi
      sleep 0.25
    done
  done

  local -a remaining=()
  for pid in "${watching[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then
      remaining+=("$pid")
    fi
  done
  if ((${#remaining[@]} == 0)); then
    ui::ok "${LOG_TAG}" "停止が完了しました。"
    return 0
  fi

  ui::warn "${LOG_TAG}" "SIGTERM では終了しない PID: ${remaining[*]}"
  if is_force_kill_enabled; then
    ui::warn "${LOG_TAG}" "API_FORCE_KILL が指定されているため確認を省略し SIGKILL を送信します。"
  else
    local escalate="false"
    ui::ask_yesno escalate "${LOG_TAG}" "SIGKILL を送信して強制終了しますか？" N
    if [[ "${escalate}" != "true" ]]; then
      return 1
    fi
  fi

  ui::warn "${LOG_TAG}" "SIGKILL を送信します: ${remaining[*]}"
  for pid in "${remaining[@]}"; do
    kill -KILL "$pid" 2>/dev/null || true
  done

  for pid_wait in "${remaining[@]}"; do
    local loops=0
    while kill -0 "$pid_wait" 2>/dev/null; do
      ((loops++))
      if (( loops > 20 )); then
        ui::err "${LOG_TAG}" "PID ${pid_wait} を強制終了できませんでした。"
        return 1
      fi
      sleep 0.25
    done
  done

  ui::ok "${LOG_TAG}" "強制終了が完了しました。"
  return 0
}

check_port_conflict() {
  if [[ ! "${API_PORT}" =~ ^[0-9]+$ ]]; then
    fail "API_PORT は整数で指定してください: ${API_PORT}"
  fi

  local -a conflict_pids=()
  local lsof_pids
  lsof_pids="$(lsof -nP -t -iTCP:"${API_PORT}" -sTCP:LISTEN 2>/dev/null | sort -u || true)"
  while IFS= read -r pid; do
    [[ -z "$pid" ]] && continue
    conflict_pids+=("$pid")
  done <<<"${lsof_pids}"
  if ((${#conflict_pids[@]} == 0)); then
    return 0
  fi

  ui::warn "${LOG_TAG}" "ポート ${API_PORT} は既存プロセスが使用中です。"
  local details
  if details="$(lsof -nP -iTCP:"${API_PORT}" -sTCP:LISTEN 2>/dev/null)"; then
    while IFS= read -r line; do
      [[ -z "$line" ]] && continue
      ui::info "${LOG_TAG}" "  ${line}"
    done <<<"${details}"
  fi

  if is_assume_yes_enabled; then
    ui::warn "${LOG_TAG}" "API_ASSUME_YES が指定されているため確認を省略し既存プロセスを停止します。"
  else
    if [[ ! -t 0 ]]; then
      fail "非対話環境では既存プロセスを停止できません。API_PORT=${API_PORT} を変更するか手動で停止してください。"
    fi

    local answer="false"
    ui::ask_yesno answer "${LOG_TAG}" "既存プロセスを停止しますか？" N
    if [[ "${answer}" != "true" ]]; then
      fail "ポート ${API_PORT} が使用中のため起動を中断します。"
    fi
  fi

  if ! terminate_conflicts "${conflict_pids[@]}"; then
    fail "既存プロセスを停止できなかったため起動を中断します。"
  fi
}

handle_signal() {
  local sig="$1"
  ((SIGNAL_ATTEMPTS++))
  local label="$sig"
  case "$sig" in
    INT) label="SIGINT";;
    TERM) label="SIGTERM";;
  esac

  ui::warn "${LOG_TAG}" "${label} を受信したためローカル API を停止します。"

  if [[ -z "${SERVER_PID}" ]]; then
    ui::warn "${LOG_TAG}" "停止対象のプロセスがありません。"
    return
  fi
  if ! kill -0 "${SERVER_PID}" 2>/dev/null; then
    return
  fi

  kill -"${sig}" "${SERVER_PID}" 2>/dev/null || kill -TERM "${SERVER_PID}" 2>/dev/null || true

  local loops=0
  while kill -0 "${SERVER_PID}" 2>/dev/null; do
    ((loops++))
    if (( loops > 20 )); then
      ui::warn "${LOG_TAG}" "停止が完了しないため強制終了を試みます。"
      kill -KILL "${SERVER_PID}" 2>/dev/null || true
      break
    fi
    sleep 0.25
  done
}

trap 'handle_signal INT' INT
trap 'handle_signal TERM' TERM

check_port_conflict

log_info "起動します: http://${API_HOST}:${API_PORT}/"

"${VENV_PY}" "${SCRIPT_DIR}/local_api_server.py" --host "${API_HOST}" --port "${API_PORT}" &
SERVER_PID=$!

wait_for_ready() {
  local loops=0
  while true; do
    ((loops++))

    if ! kill -0 "${SERVER_PID}" 2>/dev/null; then
      fail "ローカル API が起動直後に終了しました。PID=${SERVER_PID} です。"
    fi

    if lsof -nP -p "${SERVER_PID}" -iTCP:"${API_PORT}" -sTCP:LISTEN >/dev/null 2>&1; then
      ui::ok "${LOG_TAG}" "ready: http://${API_HOST}:${API_PORT}/。POST /encode, POST /decode に対応。"
      ui::info "${LOG_TAG}" "停止: Ctrl+C"
      ui::info "${LOG_TAG}" "別ターミナルから停止する場合: kill ${SERVER_PID}"
      return 0
    fi

    if (( loops > 100 )); then
      ui::warn "${LOG_TAG}" "ready 確認がタイムアウトしました。10 秒です。プロセスは起動しています: PID=${SERVER_PID}"
      return 0
    fi

    sleep 0.1
  done
}

wait_for_ready

wait "${SERVER_PID}"
