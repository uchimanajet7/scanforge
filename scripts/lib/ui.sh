#!/usr/bin/env bash
# 共通 UI ライブラリ（ScanForge のスクリプト群で統一するログ出力: `[tag] message` 形式）
set -euo pipefail

# 色付き出力の判定
ui::init() {
  UI_COLOR=0
  if [[ "${DEPLOY_COLOR:-}" == "1" || "${CLICOLOR_FORCE:-}" == "1" ]]; then
    UI_COLOR=1
  elif [[ -t 2 && -z "${NO_COLOR:-}" && "${CLICOLOR:-1}" != "0" ]]; then
    if command -v tput >/dev/null 2>&1 && [[ $(tput colors 2>/dev/null || echo 0) -ge 8 ]]; then
      UI_COLOR=1
    else
      UI_COLOR=1
    fi
  fi

  if [[ $UI_COLOR -eq 1 ]]; then
    UI_RESET="\033[0m"; UI_BOLD="\033[1m"
    UI_FG_RED="\033[31m"; UI_FG_GREEN="\033[32m"; UI_FG_YELLOW="\033[33m"; UI_FG_BLUE="\033[34m"; UI_FG_CYAN="\033[36m"; UI_DIM="\033[2m"
  else
    UI_RESET=""; UI_BOLD=""; UI_FG_RED=""; UI_FG_GREEN=""; UI_FG_YELLOW=""; UI_FG_BLUE=""; UI_FG_CYAN=""; UI_DIM=""
  fi
}

ui::_tag() {
  local tag="$1"; local color="$2"; local bold="$3"
  local open=""; local close="${UI_RESET}"
  case "$color" in
    red)   open="${UI_FG_RED}";;
    green) open="${UI_FG_GREEN}";;
    yellow)open="${UI_FG_YELLOW}";;
    blue)  open="${UI_FG_BLUE}";;
    cyan)  open="${UI_FG_CYAN}";;
    dim)   open="${UI_DIM}"; close="${UI_RESET}";;
    *)     open=""; close="";;
  esac
  [[ "$bold" == "1" ]] && open="${UI_BOLD}${open}"
  printf "%b[%s]%b" "$open" "$tag" "$close"
}

ui::_out() {
  if [[ -t 2 || -t 1 || -t 0 ]]; then
    if [[ -r /dev/tty && -w /dev/tty ]]; then
      printf '%s' "tty"
      return
    fi
  fi
  if [[ -t 2 ]]; then
    printf '%s' "fd2"
    return
  fi
  if [[ -t 1 ]]; then
    printf '%s' "fd1"
    return
  fi
  printf '%s' "fd2"
}

ui::hdr() {
  local out; out="$(ui::_out)"
  case "$out" in
    tty)
      ui::_tag "$1" blue 1 > /dev/tty
      printf " %s\n" "$2" > /dev/tty
      ;;
    fd1)
      ui::_tag "$1" blue 1 >&1
      printf " %s\n" "$2" >&1
      ;;
    *)
      ui::_tag "$1" blue 1 >&2
      printf " %s\n" "$2" >&2
      ;;
  esac
}

ui::info() {
  local out; out="$(ui::_out)"
  case "$out" in
    tty)
      ui::_tag "$1" dim 0 > /dev/tty
      printf " %s\n" "$2" > /dev/tty
      ;;
    fd1)
      ui::_tag "$1" dim 0 >&1
      printf " %s\n" "$2" >&1
      ;;
    *)
      ui::_tag "$1" dim 0 >&2
      printf " %s\n" "$2" >&2
      ;;
  esac
}

ui::ok() {
  local out; out="$(ui::_out)"
  case "$out" in
    tty)
      ui::_tag "$1" green 0 > /dev/tty
      printf " %s\n" "$2" > /dev/tty
      ;;
    fd1)
      ui::_tag "$1" green 0 >&1
      printf " %s\n" "$2" >&1
      ;;
    *)
      ui::_tag "$1" green 0 >&2
      printf " %s\n" "$2" >&2
      ;;
  esac
}

ui::warn() {
  local out; out="$(ui::_out)"
  case "$out" in
    tty)
      ui::_tag "$1" yellow 0 > /dev/tty
      printf " %s\n" "$2" > /dev/tty
      ;;
    fd1)
      ui::_tag "$1" yellow 0 >&1
      printf " %s\n" "$2" >&1
      ;;
    *)
      ui::_tag "$1" yellow 0 >&2
      printf " %s\n" "$2" >&2
      ;;
  esac
}

ui::err() {
  local out; out="$(ui::_out)"
  case "$out" in
    tty)
      ui::_tag "$1" red 1 > /dev/tty
      printf " %s\n" "$2" > /dev/tty
      ;;
    fd1)
      ui::_tag "$1" red 1 >&1
      printf " %s\n" "$2" >&1
      ;;
    *)
      ui::_tag "$1" red 1 >&2
      printf " %s\n" "$2" >&2
      ;;
  esac
}

ui::run() {
  local out; out="$(ui::_out)"
  case "$out" in
    tty)
      ui::_tag "$1" dim 0 > /dev/tty
      printf " run: %s\n" "$2" > /dev/tty
      ;;
    fd1)
      ui::_tag "$1" dim 0 >&1
      printf " run: %s\n" "$2" >&1
      ;;
    *)
      ui::_tag "$1" dim 0 >&2
      printf " run: %s\n" "$2" >&2
      ;;
  esac
}

ui::debug() {
  if [[ "${DEPLOY_DEBUG:-}" == "1" ]]; then
    ui::_tag "$1" dim 0 >&2; printf " [debug] %s\n" "$2" >&2;
  fi
}

ui::ts() {
  if command -v gdate >/dev/null 2>&1; then
    gdate '+%Y/%m/%d %H:%M:%S.%3N (%Z)'
    return
  fi
  if date --version >/dev/null 2>&1; then
    date '+%Y/%m/%d %H:%M:%S.%3N (%Z)'
    return
  fi
  local ns
  ns=$(date '+%N' 2>/dev/null || true)
  if [[ "$ns" =~ ^[0-9]+$ && ${#ns} -ge 3 ]]; then
    local ms=${ns:0:3}
    printf '%s.%03d (%s)\n' "$(date '+%Y/%m/%d %H:%M:%S')" "$ms" "$(date '+%Z')"
    return
  fi
  date '+%Y/%m/%d %H:%M:%S (%Z)'
}

ui::epoch_ms() {
  if command -v gdate >/dev/null 2>&1; then
    gdate +%s%3N 2>/dev/null && return
  fi
  if date --version >/dev/null 2>&1; then
    date +%s%3N 2>/dev/null && return
  fi
  local ns
  ns=$(date '+%N' 2>/dev/null || true)
  if [[ "$ns" =~ ^[0-9]+$ && ${#ns} -ge 3 ]]; then
    local sec
    sec=$(date '+%s' 2>/dev/null)
    printf '%s' $(( sec*1000 + 10#${ns:0:3} ))
    return
  fi
  printf '%s' $(( $(date +%s 2>/dev/null) * 1000 ))
}

ui::fmt_elapsed_ms() {
  local ms=${1:-0}
  if [[ $ms -lt 0 ]]; then ms=0; fi
  local total_s=$(( ms / 1000 ))
  local rem_ms=$(( ms % 1000 ))
  local s=$(( total_s % 60 ))
  local m=$(( (total_s / 60) % 60 ))
  local h=$(( total_s / 3600 ))
  if (( h == 0 && m == 0 )); then
    printf '%d.%03ds' "$s" "$rem_ms"
  elif (( h == 0 )); then
    printf '%d:%02d.%03d' "$m" "$s" "$rem_ms"
  else
    printf '%d:%02d:%02d.%03d' "$h" "$m" "$s" "$rem_ms"
  fi
}

ui::section_start() { # 引数: $1=格納先変数名 $2=タグ $3=ログラベル（省略可）
  local __var="$1"; shift
  local tag="$1"; shift
  local label="${1:-start}"
  [[ -n "$label" ]] || label="start"
  local now_ms ts
  now_ms="$(ui::epoch_ms)"
  ts="$(ui::ts)"
  ui::hdr "$tag" "----- ${label}: ${ts} -----"
  printf -v "$__var" '%s' "$now_ms"
}

ui::section_end() { # 引数: $1=タグ $2=開始時刻(ミリ秒) $3=ログラベル（省略可）
  local tag="$1"; shift
  local started_raw="${1:-0}"; shift || true
  local label="${1:-end}"
  [[ -n "$label" ]] || label="end"
  local started_ms=0
  if [[ "${started_raw}" =~ ^[0-9]+$ ]]; then
    started_ms=$(( 10#${started_raw} ))
  fi
  local now_ms elapsed
  now_ms="$(ui::epoch_ms)"
  if [[ "${now_ms}" =~ ^[0-9]+$ ]]; then
    elapsed=$(( 10#${now_ms} - started_ms ))
  else
    elapsed=0
  fi
  if [[ $elapsed -lt 0 ]]; then
    elapsed=0
  fi
  local formatted_elapsed
  formatted_elapsed="$(ui::fmt_elapsed_ms "$elapsed")"
  ui::hdr "$tag" "----- ${label}: $(ui::ts) (elapsed=${formatted_elapsed}) -----"
}

ui::debug_fp() {
  if [[ "${DEPLOY_DEBUG:-}" != "1" ]]; then return; fi
  local tag="$1"; local file="$2"
  local hash="" short="" mt="" mth=""
  if [[ -r "$file" ]]; then
    if command -v shasum >/dev/null 2>&1; then
      hash=$(shasum -a 256 "$file" 2>/dev/null | awk '{print $1}')
    elif command -v sha256sum >/dev/null 2>&1; then
      hash=$(sha256sum "$file" 2>/dev/null | awk '{print $1}')
    elif command -v cksum >/dev/null 2>&1; then
      hash=$(cksum "$file" 2>/dev/null | awk '{print $1}')
    else
      hash="unknown"
    fi
    short="${hash:0:12}"
    set +e
    if stat -f %m "$file" >/dev/null 2>&1; then
      mt=$(stat -f %m "$file")
    elif stat -c %Y "$file" >/dev/null 2>&1; then
      mt=$(stat -c %Y "$file")
    fi
    if [[ -n "$mt" ]]; then
      if date -r "$mt" '+%Y-%m-%d %H:%M:%S %Z' >/dev/null 2>&1; then
        mth=$(date -r "$mt" '+%Y-%m-%d %H:%M:%S %Z')
      elif date -d "@$mt" '+%Y-%m-%d %H:%M:%S %Z' >/dev/null 2>&1; then
        mth=$(date -d "@$mt" '+%Y-%m-%d %H:%M:%S %Z')
      else
        mth="$mt"
      fi
    fi
    set -e
    ui::debug "$tag" "fp=${short:-unknown} mtime=${mth:-unknown} file=${file}"
  else
    ui::debug "$tag" "fp=unreadable file=${file}"
  fi
}

ui::ask() {
  local __var="$1"; shift; local tag="$1"; shift; local prompt="$1"; shift; local def="${1:-}"
  local suffix=""; [[ -n "$def" ]] && suffix=" [${def}]"
  local out; out="$(ui::_out)"
  case "$out" in
    tty)
      ui::_tag "$tag" cyan 1 > /dev/tty
      printf " %s%s: " "$prompt" "$suffix" > /dev/tty
      ;;
    fd1)
      ui::_tag "$tag" cyan 1 >&1
      printf " %s%s: " "$prompt" "$suffix" >&1
      ;;
    *)
      ui::_tag "$tag" cyan 1 >&2
      printf " %s%s: " "$prompt" "$suffix" >&2
      ;;
  esac
  local ans
  if [[ -t 2 || -t 1 || -t 0 ]] && [[ -r /dev/tty ]]; then IFS= read -r ans < /dev/tty; else IFS= read -r ans; fi
  if [[ -z "$ans" && -n "$def" ]]; then ans="$def"; fi
  printf -v "$__var" '%s' "$ans"
}

ui::ask_silent() {
  local __var="$1"; shift; local tag="$1"; shift; local prompt="$1"; shift; local def="${1:-}"
  local out; out="$(ui::_out)"
  case "$out" in
    tty)
      ui::_tag "$tag" cyan 1 > /dev/tty
      printf " %s: " "$prompt" > /dev/tty
      ;;
    fd1)
      ui::_tag "$tag" cyan 1 >&1
      printf " %s: " "$prompt" >&1
      ;;
    *)
      ui::_tag "$tag" cyan 1 >&2
      printf " %s: " "$prompt" >&2
      ;;
  esac
  local ans
  if [[ -t 2 || -t 1 || -t 0 ]] && [[ -r /dev/tty ]]; then IFS= read -r ans < /dev/tty; else IFS= read -r ans; fi
  if [[ -z "$ans" && -n "$def" ]]; then ans="$def"; fi
  printf -v "$__var" '%s' "$ans"
}

ui::ask_yesno() {
  local __var="$1"; shift; local tag="$1"; shift; local prompt="$1"; shift; local defYN="${1:-N}"
  local hint="[y/N]"; [[ "$defYN" =~ ^[Yy]$ ]] && hint="[Y/n]"
  local out; out="$(ui::_out)"
  case "$out" in
    tty)
      ui::_tag "$tag" cyan 1 > /dev/tty
      printf " %s %s: " "$prompt" "$hint" > /dev/tty
      ;;
    fd1)
      ui::_tag "$tag" cyan 1 >&1
      printf " %s %s: " "$prompt" "$hint" >&1
      ;;
    *)
      ui::_tag "$tag" cyan 1 >&2
      printf " %s %s: " "$prompt" "$hint" >&2
      ;;
  esac
  local ans
  if [[ -t 2 || -t 1 || -t 0 ]] && [[ -r /dev/tty ]]; then
    IFS= read -r ans < /dev/tty
  else
    IFS= read -r ans
  fi
  ans="${ans:-$defYN}"
  case "$ans" in
    Y|y|Yes|yes) printf -v "$__var" 'true';;
    *)           printf -v "$__var" 'false';;
  esac
}
