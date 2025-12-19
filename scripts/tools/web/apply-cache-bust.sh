#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# キャッシュバスティング適用スクリプト
# HTMLファイル内のCSS/JSのURLに?v=VERSIONを付与する
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
HTML_FILE="${REPO_ROOT}/web/index.html"

# 共通UIライブラリを読み込み
source "${SCRIPT_DIR}/../../lib/ui.sh"
ui::init

LOG_TAG="cache-bust"

# ログ関数
log_info() { ui::info "${LOG_TAG}" "$1"; }
log_ok() { ui::ok "${LOG_TAG}" "$1"; }
log_err() { ui::err "${LOG_TAG}" "$1"; }

# バージョン決定
VERSION="${1:-}"
if [[ -z "${VERSION}" ]]; then
  # 引数がない場合はタイムスタンプを生成
  VERSION=$(date +%Y%m%d-%H%M%S)
  log_info "自動生成バージョン: ${VERSION}"
else
  log_info "指定バージョン: ${VERSION}"
fi

# HTMLファイルが存在するか確認
if [[ ! -f "${HTML_FILE}" ]]; then
  log_err "HTMLファイルが見つかりません: ${HTML_FILE}"
  exit 1
fi

# バックアップ作成（.originalがない場合のみ）
if [[ ! -f "${HTML_FILE}.original" ]]; then
  cp "${HTML_FILE}" "${HTML_FILE}.original"
  log_info "バックアップ作成: ${HTML_FILE}.original"
fi

# 既存のバージョンパラメータを削除してから新しいバージョンを追加
# styles.css, app.js のURLを処理
sed -i.bak -E \
  -e 's|(href="styles\.css)(\?v=[^"]*)?"|\1?v='${VERSION}'"|g' \
  -e 's|(src="app\.js)(\?v=[^"]*)?"|\1?v='${VERSION}'"|g' \
  "${HTML_FILE}"

# 成功確認
if [[ $? -eq 0 ]]; then
  log_ok "キャッシュバスティング適用完了"

  # 適用されたURLを表示
  log_info "適用されたURL:"
  grep -E '(styles\.css|app\.js)\?v=' "${HTML_FILE}" | while read -r line; do
    # URLの部分だけ抽出して表示
    url=$(echo "$line" | grep -oE '(href|src)="[^"]+"' | cut -d'"' -f2)
    if [[ -n "$url" ]]; then
      log_info "  ${url}"
    fi
  done

  # 一時ファイルを削除
  rm -f "${HTML_FILE}.bak"
else
  log_err "キャッシュバスティングの適用に失敗しました"
  # 失敗時は元に戻す
  mv "${HTML_FILE}.bak" "${HTML_FILE}"
  exit 1
fi
