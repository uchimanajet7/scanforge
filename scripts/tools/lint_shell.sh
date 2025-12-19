#!/usr/bin/env bash
# ShellCheck ラッパー（ローカル/CI共通）
# 用途:
#   - 警告もエラーとして扱う: bash scripts/tools/lint_shell.sh --strict
#   - 既定（警告は許容）:     bash scripts/tools/lint_shell.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# UI 初期化（存在しない環境でも動くよう best-effort）
if [[ -f "${ROOT_DIR}/scripts/lib/ui.sh" ]]; then
  # shellcheck disable=SC1091
  source "${ROOT_DIR}/scripts/lib/ui.sh"; ui::init || true
  info() { ui::info lint "$*"; }
  ok()   { ui::ok   lint "$*"; }
  err()  { ui::err  lint "$*"; }
else
  info() { printf '[INFO] %s\n' "$*" >&2; }
  ok()   { printf '[ OK ] %s\n' "$*" >&2; }
  err()  { printf '[ERR ] %s\n' "$*" >&2; }
fi

STRICT="false"

usage() {
  cat <<'USAGE'
使い方: bash scripts/tools/lint_shell.sh [--strict]
  --strict  警告もエラーとして扱います（CI相当）
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --strict) STRICT="true"; shift ;;
    -h|--help) usage; exit 0 ;;
    *) err "不明な引数: $1"; usage; exit 2 ;;
  esac
done

if ! command -v shellcheck >/dev/null 2>&1; then
  err "shellcheck が見つかりません。インストール後に再実行してください（例: 'brew install shellcheck'）。"
  exit 127
fi

# 対象ファイル一覧（優先: git / フォールバック: find）
FILES_LIST=""
if command -v git >/dev/null 2>&1; then
  set +e
  FILES_LIST=$(cd "${ROOT_DIR}" && git ls-files 'scripts/**/*.sh' 2>/dev/null)
  set -e
fi
if [[ -z "$FILES_LIST" ]]; then
  FILES_LIST=$(cd "${ROOT_DIR}" && find scripts -type f -name '*.sh' -print 2>/dev/null || true)
fi

if [[ -z "$FILES_LIST" ]]; then
  info "scripts/ 配下に .sh が見つかりません。スキップします。"
  exit 0
fi

# Bash 3.2 互換: 配列/mapfile を使わず引数を構築
set --
while IFS= read -r f; do
  [[ -n "$f" ]] || continue
  set -- "$@" "$f"
done <<< "$FILES_LIST"

LEVEL="warning"
[[ "$STRICT" == "true" ]] && LEVEL="error"

info "ShellCheck を実行します（対象=$#, level=${LEVEL}）"
shellcheck -S "$LEVEL" "$@"
ok "ShellCheck OK（level=${LEVEL}）"

