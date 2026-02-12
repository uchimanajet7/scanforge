#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# tools/api の Python 仮想環境を作成し、lambda/requirements.txt の依存をインストールする。
# - 依存定義: lambda/requirements.txt
# - 仮想環境の配置先: tools/api/.venv
# - 一時領域: tools/api/tmp。オペレーティング・システムの /tmp を使わない。
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

# 共通 UI ライブラリを読み込み、既存ツールと統一されたログ書式を用いる。
source "${SCRIPT_DIR}/../../lib/ui.sh"
ui::init
LOG_TAG="api"

log_info() { ui::info "${LOG_TAG}" "$1"; }
log_ok() { ui::ok "${LOG_TAG}" "$1"; }
fail() {
  ui::err "${LOG_TAG}" "$1"
  exit 1
}

PYTHON_BIN="${API_PYTHON:-python3}"
TOOLS_DIR="${REPO_ROOT}/tools/api"
VENV_DIR="${TOOLS_DIR}/.venv"
TMP_DIR="${TOOLS_DIR}/tmp"
REQUIREMENTS_FILE="${REPO_ROOT}/lambda/requirements.txt"

command -v "${PYTHON_BIN}" >/dev/null 2>&1 || fail "${PYTHON_BIN} が見つかりません。Python 3 をインストールしてください。"

if [[ ! -f "${REQUIREMENTS_FILE}" ]]; then
  fail "依存ファイルが見つかりません: ${REQUIREMENTS_FILE}"
fi

mkdir -p "${TOOLS_DIR}" "${TMP_DIR}"

VENV_PY="${VENV_DIR}/bin/python"
if [[ ! -x "${VENV_PY}" ]]; then
  log_info "venv を作成します: ${VENV_DIR#${REPO_ROOT}/}"
  "${PYTHON_BIN}" -m venv "${VENV_DIR}"
fi
[[ -x "${VENV_PY}" ]] || fail "venv の Python が見つかりません: ${VENV_PY}"

export TMPDIR="${TMP_DIR}"
export PIP_CACHE_DIR="${TMP_DIR}/pip-cache"
export PIP_DISABLE_PIP_VERSION_CHECK=1

log_info "依存をインストールします: ${REQUIREMENTS_FILE#${REPO_ROOT}/}"
"${VENV_PY}" -m pip install -r "${REQUIREMENTS_FILE}"

log_ok "venv 準備が完了しました: ${VENV_DIR#${REPO_ROOT}/}"
