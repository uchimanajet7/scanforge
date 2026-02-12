#!/usr/bin/env bash
set -euo pipefail

# このスクリプトは Static Web Server を自動取得し、ScanForge のウェブユーザーインターフェースをローカルで提供する。

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
TOOLS_DIR="${REPO_ROOT}/tools/web"
SWS_BIN="${TOOLS_DIR}/static-web-server"
REQUESTED_VERSION="${SWS_VERSION:-}"
REQUESTED_RAW="${SWS_VERSION:-}"
SWS_TAG=""
SWS_VERSION=""
CURRENT_SWS_VERSION=""
DEFAULT_ROOT="${REPO_ROOT}/web"
SWS_ROOT="${SWS_ROOT:-${DEFAULT_ROOT}}"
SWS_PORT="${SWS_PORT:-8000}"
SWS_CONFIG_FILE="${SWS_CONFIG_FILE:-}"
GENERATED_CONFIG=""

# 共通 UI ライブラリを読み込み、既存ツールと統一されたログ書式を用いる。
source "${SCRIPT_DIR}/../../lib/ui.sh"
ui::init
LOG_TAG="sws"
SCRIPT_SECTION_OPEN=0
SCRIPT_START_MS=""
SERVER_PID=""
SIGNAL_ATTEMPTS=0
FORCE_KILL_FLAG="${SWS_FORCE_KILL:-}"
CLIENT_LOG_LEVEL_RAW="${LOG_LEVEL:-}"
CLIENT_LOG_LEVEL=""

is_force_kill_enabled() {
  case "${FORCE_KILL_FLAG}" in
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

log_info() { ui::info "${LOG_TAG}" "$1"; }
log_warn() { ui::warn "${LOG_TAG}" "$1"; }
fail() {
  ui::err "${LOG_TAG}" "$1"
  exit 1
}

if [[ -n "${CLIENT_LOG_LEVEL_RAW}" ]]; then
  client_log_lower="$(printf '%s' "${CLIENT_LOG_LEVEL_RAW}" | tr '[:upper:]' '[:lower:]')"
  case "${client_log_lower}" in
    error|warn|info|debug)
      CLIENT_LOG_LEVEL="${client_log_lower}"
      ;;
    *)
      log_warn "LOG_LEVEL=${CLIENT_LOG_LEVEL_RAW} は未対応の値です。利用可能な値: error, warn, info, debug"
      CLIENT_LOG_LEVEL=""
      ;;
  esac
fi

# 必須コマンドの存在チェックを行う。
command -v curl >/dev/null 2>&1 || fail "curl が見つかりません。事前にインストールしてください。"
command -v tar >/dev/null 2>&1 || fail "tar が見つかりません。事前にインストールしてください。"
command -v lsof >/dev/null 2>&1 || fail "lsof が見つかりません。事前にインストールしてください。"

# 取得対象のリリースタグとバージョン番号を決定する。
# `SWS_VERSION` が未指定の場合は GitHub API から最新タグを取得し、指定されている場合はその値をそのまま採用する。
determine_version() {
  if [[ -n "${REQUESTED_VERSION}" ]]; then
    case "${REQUESTED_VERSION}" in
      latest)
        REQUESTED_VERSION=""
        ;;
      v*)
        SWS_TAG="${REQUESTED_VERSION}"
        SWS_VERSION="${REQUESTED_VERSION#v}"
        return
        ;;
      *)
        SWS_TAG="v${REQUESTED_VERSION}"
        SWS_VERSION="${REQUESTED_VERSION}"
        return
        ;;
    esac
  fi

  log_info "最新リリース情報を取得します"
  local api_url="https://api.github.com/repos/static-web-server/static-web-server/releases/latest"
  local response tag
  if ! response="$(curl -fsSL "${api_url}")"; then
    fail "最新リリース取得に失敗しました。ネットワーク状態を確認してください。"
  fi
  tag="$(printf '%s\n' "${response}" | grep -m1 '"tag_name"' | sed -E 's/.*"tag_name": *"([^"]+)".*/\1/')"
  if [[ -z "${tag}" ]]; then
    fail "最新リリースのタグ名を解析できませんでした。"
  fi
  SWS_TAG="${tag}"
  SWS_VERSION="${tag#v}"
}

determine_version
[[ -n "${SWS_TAG}" ]] || fail "リリースタグの決定に失敗しました。"
[[ -n "${SWS_VERSION}" ]] || fail "バージョン番号の決定に失敗しました。"
log_info "取得予定バージョン: ${SWS_VERSION}"

# OS / アーキテクチャごとにダウンロード対象のアセット名を判定する。
# GitHub リリースは OS・アーキごとに別アーカイブのため、`uname -s` と `uname -m` で分岐する。
detect_asset() {
  local os arch
  os="$(uname -s)"
  arch="$(uname -m)"

  case "${os}" in
    Darwin)
      case "${arch}" in
        arm64) echo "static-web-server-${SWS_TAG}-aarch64-apple-darwin.tar.gz" ;;
        x86_64) echo "static-web-server-${SWS_TAG}-x86_64-apple-darwin.tar.gz" ;;
        *) fail "未対応アーキテクチャです: ${os}-${arch}" ;;
      esac
      ;;
    Linux)
      case "${arch}" in
        x86_64) echo "static-web-server-${SWS_TAG}-x86_64-unknown-linux-gnu.tar.gz" ;;
        aarch64) echo "static-web-server-${SWS_TAG}-aarch64-unknown-linux-gnu.tar.gz" ;;
        armv7l) echo "static-web-server-${SWS_TAG}-armv7-unknown-linux-gnueabihf.tar.gz" ;;
        *) fail "未対応アーキテクチャです: ${os}-${arch}" ;;
      esac
      ;;
    *)
      fail "未対応 OS です: ${os}"
      ;;
  esac
}

# 既存バイナリのバージョンが指定値と一致しているか判定する。
# 一致していれば再ダウンロードせずに既存バイナリを再利用し、異なる場合だけ更新する。
needs_download() {
  if [[ ! -x "${SWS_BIN}" ]]; then
    CURRENT_SWS_VERSION=""
    return 0
  fi
  local version_output current
  version_output="$("${SWS_BIN}" --version 2>/dev/null || true)"
  current="$(printf '%s\n' "${version_output}" | grep -Eo '[0-9]+\.[0-9]+\.[0-9]+' | head -n1)"
  if [[ -z "${current}" ]]; then
    log_info "バージョンが判定できませんでした。再取得します。"
    CURRENT_SWS_VERSION=""
    return 0
  fi
  CURRENT_SWS_VERSION="${current}"
  log_info "現在インストール済みバージョン: ${CURRENT_SWS_VERSION}"
  if [[ "${current}" != "${SWS_VERSION}" ]]; then
    log_info "要求バージョン ${SWS_VERSION} と現在の ${current} が異なるため再取得します。"
    return 0
  fi
  return 1
}

# 更新を実行するか利用者へ確認する。戻り値 0 で更新、1 でスキップ。
confirm_update() {
  # 既存バイナリが無い場合はそのまま更新する。
  if [[ -z "${CURRENT_SWS_VERSION}" ]]; then
    return 0
  fi

  # 明示的にバージョンが指定されている、または自動更新許可が出ている場合は確認を省略する。
  if [[ -n "${REQUESTED_RAW}" && "${REQUESTED_RAW}" != latest ]]; then
    return 0
  fi
  if [[ "${REQUESTED_RAW}" == latest ]]; then
    return 0
  fi
  if [[ "${SWS_AUTO_UPDATE:-}" == 1 || "${SWS_AUTO_UPDATE:-}" == "true" ]]; then
    return 0
  fi
  if [[ "${SWS_ASSUME_YES:-}" == 1 || "${SWS_ASSUME_YES:-}" == "true" ]]; then
    return 0
  fi
  if [[ "${SWS_ASSUME_NO:-}" == 1 || "${SWS_ASSUME_NO:-}" == "true" ]]; then
    log_info "環境変数により SWS の置き換えをスキップします。既存バージョン ${CURRENT_SWS_VERSION} を使用します。"
    return 1
  fi

  # 対話入力が利用できない場合は既存バージョンを使用する。
  if [[ ! -t 0 ]]; then
    log_info "対話入力が利用できないため、既存バージョン ${CURRENT_SWS_VERSION} を継続利用します。自動更新したい場合は SWS_AUTO_UPDATE=1 を指定してください。"
    return 1
  fi

  local answer
  ui::ask_yesno answer "${LOG_TAG}" "現在: ${CURRENT_SWS_VERSION} / 取得予定: ${SWS_VERSION} — 置き換えますか？" Y
  if [[ "${answer}" == "true" ]]; then
    return 0
  fi
  log_info "利用者の選択により更新をスキップします。既存バージョン ${CURRENT_SWS_VERSION} を使用します。"
  return 1
}

# ポート占有プロセスを停止する。SIGTERM → 必要時 SIGKILL の順に送る。
terminate_conflicts() { # $@=PID 群
  local -a targets=("$@")
  local pid

  if ((${#targets[@]} == 0)); then
    return 0
  fi

  for pid in "${targets[@]}"; do
    if [[ "$pid" -eq 1 ]]; then
      ui::err "${LOG_TAG}" "PID 1 は停止できません。"
      return 1
    fi
  done

  ui::info "${LOG_TAG}" "SIGTERM を送信します: ${targets[*]}"
  local -a remaining=()
  for pid in "${targets[@]}"; do
    if kill -TERM "$pid" 2>/dev/null; then
      continue
    fi
    if kill -0 "$pid" 2>/dev/null; then
      ui::warn "${LOG_TAG}" "プロセス識別子 ${pid} に終了要求シグナル SIGTERM を送信できませんでした。権限不足の可能性があります。"
      remaining+=("$pid")
    fi
  done

  # 送信に成功した PID も含め、終了を一定時間待つ。
  local -a watching=("${targets[@]}")
  local attempt=0
  while (( attempt < 20 )); do
    sleep 0.25
    local -a still_alive=()
    for pid in "${watching[@]}"; do
      if kill -0 "$pid" 2>/dev/null; then
        still_alive+=("$pid")
      fi
    done
    if ((${#still_alive[@]} == 0)); then
      ui::ok "${LOG_TAG}" "ポート ${SWS_PORT} の既存プロセスを終了しました。"
      return 0
    fi
    watching=("${still_alive[@]}")
    ((attempt++))
  done

  ui::warn "${LOG_TAG}" "SIGTERM では終了しない PID: ${watching[*]}"
  if is_force_kill_enabled; then
    ui::warn "${LOG_TAG}" "SWS_FORCE_KILL が指定されているため確認を省略し SIGKILL を送信します。"
  else
    local escalate="false"
    ui::ask_yesno escalate "${LOG_TAG}" "SIGKILL を送信して強制終了しますか？" N
    if [[ "${escalate}" != "true" ]]; then
      return 1
    fi
  fi

  ui::warn "${LOG_TAG}" "SIGKILL を送信します: ${watching[*]}"
  local pid_kill
  for pid_kill in "${watching[@]}"; do
    if kill -KILL "$pid_kill" 2>/dev/null; then
      continue
    fi
    if kill -0 "$pid_kill" 2>/dev/null; then
      ui::warn "${LOG_TAG}" "PID ${pid_kill} に SIGKILL を送信できませんでした。"
    fi
  done

  local pid_wait
  for pid_wait in "${watching[@]}"; do
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

# ポート占有状況を確認し、停止するか利用者に尋ねる。
check_port_conflict() {
  if [[ ! "${SWS_PORT}" =~ ^[0-9]+$ ]]; then
    fail "SWS_PORT は整数で指定してください: ${SWS_PORT}"
  fi

  local -a conflict_pids=()
  local lsof_pids
  lsof_pids="$(lsof -nP -t -iTCP:"${SWS_PORT}" -sTCP:LISTEN 2>/dev/null | sort -u || true)"
  while IFS= read -r pid; do
    [[ -z "$pid" ]] && continue
    conflict_pids+=("$pid")
  done <<<"${lsof_pids}"
  if ((${#conflict_pids[@]} == 0)); then
    return 0
  fi

  ui::warn "${LOG_TAG}" "ポート ${SWS_PORT} は既存プロセスが使用中です。"
  local details
  if details="$(lsof -nP -iTCP:"${SWS_PORT}" -sTCP:LISTEN 2>/dev/null)"; then
    while IFS= read -r line; do
      [[ -z "$line" ]] && continue
      ui::info "${LOG_TAG}" "  ${line}"
    done <<<"${details}"
  fi

  if [[ ! -t 0 ]]; then
    fail "非対話環境では既存プロセスを停止できません。SWS_PORT=${SWS_PORT} を変更するか手動で停止してください。"
  fi

  local answer="false"
  ui::ask_yesno answer "${LOG_TAG}" "既存プロセスを停止しますか？" N
  if [[ "${answer}" != "true" ]]; then
    fail "ポート ${SWS_PORT} が使用中のため起動を中断します。"
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

  ui::warn "${LOG_TAG}" "${label} を受信したため Static Web Server を停止します。"

  if [[ -z "${SERVER_PID}" ]]; then
    ui::warn "${LOG_TAG}" "停止対象のプロセスがありません。"
    return
  fi
  if ! kill -0 "${SERVER_PID}" 2>/dev/null; then
    return
  fi

  if ! kill -"${sig}" "${SERVER_PID}" 2>/dev/null; then
    kill -TERM "${SERVER_PID}" 2>/dev/null || true
  fi

  local attempt=0
  local max_attempts=20
  if (( SIGNAL_ATTEMPTS == 1 )); then
    while kill -0 "${SERVER_PID}" 2>/dev/null; do
      if (( attempt >= max_attempts )); then
        break
      fi
      sleep 0.25
      ((attempt++))
      if (( attempt % 4 == 0 )); then
        local waited_ms=$(( attempt * 250 ))
        ui::info "${LOG_TAG}" "停止を待機中 (${waited_ms}ms 経過)…"
      fi
    done
  fi

  if ! kill -0 "${SERVER_PID}" 2>/dev/null; then
    ui::ok "${LOG_TAG}" "Static Web Server の停止処理が完了しました。"
    return
  fi

  ui::warn "${LOG_TAG}" "プロセスがシグナルに応答しないため強制終了を検討します (PID=${SERVER_PID})。"

  if is_force_kill_enabled; then
    ui::warn "${LOG_TAG}" "SWS_FORCE_KILL が指定されているため確認を省略し SIGKILL を送信します (PID=${SERVER_PID})。"
  elif [[ -t 0 ]]; then
    local answer="false"
    ui::ask_yesno answer "${LOG_TAG}" "SIGKILL を送信して強制終了しますか？" Y
    if [[ "${answer}" != "true" ]]; then
      ui::warn "${LOG_TAG}" "利用者の選択により SIGKILL を送信しません。PID=${SERVER_PID} を手動で停止してください。"
      return
    fi
  else
    ui::warn "${LOG_TAG}" "非対話環境のため SIGKILL を送信します (PID=${SERVER_PID})。"
  fi

  kill -KILL "${SERVER_PID}" 2>/dev/null || true

  local confirm=0
  local confirm_limit=20
  while kill -0 "${SERVER_PID}" 2>/dev/null; do
    if (( confirm >= confirm_limit )); then
      ui::err "${LOG_TAG}" "強制終了が完了しませんでした (PID=${SERVER_PID})。"
      return
    fi
    sleep 0.25
    ((confirm++))
    if (( confirm % 4 == 0 )); then
      local waited_ms=$(( confirm * 250 ))
      ui::info "${LOG_TAG}" "強制終了を待機中 (${waited_ms}ms 経過)…"
    fi
  done
  ui::ok "${LOG_TAG}" "Static Web Server の停止処理が完了しました。"
}

# SWS バイナリを最新版へ更新する。
# アーカイブを一時ディレクトリに展開し、`static-web-server` 実行ファイルのみを `tools/` 配下へ移動する。
install_sws() {
  local asset url tmp_archive tmp_dir extracted
  mkdir -p "${TOOLS_DIR}"
  asset="$(detect_asset)"
  url="https://github.com/static-web-server/static-web-server/releases/download/${SWS_TAG}/${asset}"
  tmp_archive="$(mktemp)"
  tmp_dir="$(mktemp -d)"

  log_info "SWS ${SWS_VERSION} をダウンロードします (${url})"
  curl -fsSL "${url}" -o "${tmp_archive}"

  log_info "アーカイブを解凍します"
  case "${asset}" in
    *.tar.gz) tar -xf "${tmp_archive}" -C "${tmp_dir}" ;;
    *.zip)
      command -v unzip >/dev/null 2>&1 || fail "zip 形式を展開するには unzip が必要です。"
      unzip -q "${tmp_archive}" -d "${tmp_dir}"
      ;;
    *) fail "未知のアーカイブ形式です: ${asset}" ;;
  esac
  rm -f "${tmp_archive}"

  extracted="$(find "${tmp_dir}" -maxdepth 3 -type f -name 'static-web-server' | head -n 1)"
  if [[ -z "${extracted}" ]]; then
    rm -rf "${tmp_dir}"
    fail "アーカイブ内に static-web-server バイナリが見つかりませんでした。"
  fi

  mv -f "${extracted}" "${SWS_BIN}"
  chmod +x "${SWS_BIN}"
  rm -rf "${tmp_dir}"
  log_info "インストールが完了しました: ${SWS_BIN}"
}

# SWS の配置を確認し、必要であればダウンロードする。
if needs_download; then
  if confirm_update; then
    install_sws
  else
    log_info "更新を行わず既存バイナリで起動します。"
  fi
else
  log_info "既存の SWS バイナリが要求バージョンと一致しています。"
fi

# ルートディレクトリの存在を確認する。
if [[ ! -d "${SWS_ROOT}" ]]; then
  fail "ルートディレクトリが存在しません: ${SWS_ROOT}"
fi

SWS_CONFIG_ARGS=()
if [[ -n "${SWS_CONFIG_FILE}" ]]; then
  if [[ ! -f "${SWS_CONFIG_FILE}" ]]; then
    log_warn "指定された設定ファイルが存在しません: ${SWS_CONFIG_FILE}"
    log_warn "キャッシュ無効化設定を適用できないため、ブラウザ側でハードリロードを行ってください。"
  else
    SWS_CONFIG_ARGS=(--config-file "${SWS_CONFIG_FILE}")
    log_info "設定ファイルを適用: ${SWS_CONFIG_FILE}"
  fi
else
  GENERATED_CONFIG="${TOOLS_DIR}/static-web-server.dev.toml"
  mkdir -p "$(dirname "${GENERATED_CONFIG}")"
  cat >"${GENERATED_CONFIG}" <<'EOF'
[general]
cache-control-headers = false

[[advanced.headers]]
source = "**/*"

  [advanced.headers.headers]
  Cache-Control = "no-store, max-age=0, must-revalidate"
  Pragma = "no-cache"
  Expires = "0"
EOF
  SWS_CONFIG_ARGS=(--config-file "${GENERATED_CONFIG}")
  log_info "キャッシュ無効化用設定ファイルを生成: ${GENERATED_CONFIG}"
fi

check_port_conflict

trap 'handle_signal INT' INT
trap 'handle_signal TERM' TERM

log_info "Static Web Server を起動します。"
log_info "  version=${SWS_VERSION} port=${SWS_PORT} root=${SWS_ROOT}"
if [[ -n "${GENERATED_CONFIG}" ]]; then
  log_info "  config=${GENERATED_CONFIG} (auto-generated)"
elif [[ -n "${SWS_CONFIG_FILE}" ]]; then
  log_info "  config=${SWS_CONFIG_FILE}"
fi
if [[ -n "${CLIENT_LOG_LEVEL}" ]]; then
  log_info "  WebUI logLevel=${CLIENT_LOG_LEVEL} (from LOG_LEVEL)"
fi
log_info "ブラウザで開く:"
CLIENT_URL="http://localhost:${SWS_PORT}/"
if [[ -n "${CLIENT_LOG_LEVEL}" ]]; then
  CLIENT_URL="${CLIENT_URL}?logLevel=${CLIENT_LOG_LEVEL}"
fi
	log_info "  ${CLIENT_URL}"
	if [[ -n "${CLIENT_LOG_LEVEL}" ]]; then
	  log_info "  永続化しない一時切替: window.ScanForgeLogger?.setLevel('${CLIENT_LOG_LEVEL}', { persist: false });"
	fi

"${SWS_BIN}" \
  --root "${SWS_ROOT}" \
  --port "${SWS_PORT}" \
  --log-level info \
  --cache-control-headers false \
  "${SWS_CONFIG_ARGS[@]}" &
SERVER_PID=$!
log_info "起動した SWS の PID: ${SERVER_PID}"

status=0
if ! wait "${SERVER_PID}"; then
  status=$?
fi
SERVER_PID=""
SIGNAL_ATTEMPTS=0

if [[ $status -eq 0 ]]; then
  log_info "Static Web Server が正常に終了しました。"
else
  log_warn "Static Web Server が終了しました (status=${status})。"
fi

exit "$status"
