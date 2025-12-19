#!/usr/bin/env bash
# 依存レイヤーZIP作成（manylinux wheel を優先、Docker不要）
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
source "${SCRIPT_DIR}/../lib/ui.sh"; ui::init
ui::debug_fp layer "$0"

# 開始/終了タイムスタンプ
START_TS=$(ui::ts)
START_MS=$(ui::epoch_ms)
ui::info layer "----- start: ${START_TS} -----"
__sf_end() {
  local __end_ms
  __end_ms="$(ui::epoch_ms)"
  local __diff
  __diff=$((__end_ms-START_MS))
  ui::info layer "----- end: $(ui::ts) (elapsed=$(ui::fmt_elapsed_ms "${__diff}")) -----"
}
trap __sf_end EXIT

DEFAULT_ARCH="x86_64"   # arm64 | x86_64
ARCH="$DEFAULT_ARCH"
OUTPUT_DIR="${ROOT_DIR}/infra/terraform/build"
OUTPUT_PATH="${OUTPUT_DIR}/scanforge-layer.zip"
WORK_DIR="${OUTPUT_DIR}/.layer_work"
TMP_DIR="${WORK_DIR}/tmp"
VENV_DIR="${WORK_DIR}/.venv-build-layer"
TARGET_DIR="${WORK_DIR}/python"

usage() {
  cat <<USAGE
使い方: bash scripts/deploy/build_layer.sh [--arch arm64|x86_64]
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --arch) ARCH="$2"; shift 2;;
    -h|--help) usage; exit 0;;
    *) ui::err layer "不明な引数: $1"; usage; exit 1;;
  esac
done

if [[ "$ARCH" == "arm64" ]]; then
  PLATFORM=manylinux2014_aarch64
elif [[ "$ARCH" == "x86_64" ]]; then
  PLATFORM=manylinux_2_28_x86_64
else
  ui::err layer "--arch は arm64 か x86_64 を指定してください"; exit 1
fi

ui::hdr layer "依存レイヤー作成"
ui::info layer "arch=${ARCH}, platform=${PLATFORM}"

# 作業ディレクトリをビルド配下に限定し、/tmp や外部の TMPDIR を使わない
rm -rf "${WORK_DIR}" "${OUTPUT_PATH}" >/dev/null 2>&1 || true
mkdir -p "${WORK_DIR}" "${TMP_DIR}"

python3 -m venv "${VENV_DIR}"
source "${VENV_DIR}/bin/activate"
python -m pip install --upgrade pip >/dev/null

export TMPDIR="${TMP_DIR}"
export PIP_CACHE_DIR="${TMP_DIR}/pip-cache"

pip install \
  --platform "${PLATFORM}" \
  --implementation cp \
  --python-version 3.13 \
  --abi cp313 \
  --only-binary=:all: \
  -t "${TARGET_DIR}" \
  -r lambda/requirements.txt

(
  cd "${WORK_DIR}"
  zip -rq "${OUTPUT_PATH}" python
)
deactivate
rm -rf "${WORK_DIR}" >/dev/null 2>&1 || true

ui::ok layer "完了: ${OUTPUT_PATH#${ROOT_DIR}/}"
