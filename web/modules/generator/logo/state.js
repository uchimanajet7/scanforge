/**
 * ロゴ機能向けの状態操作ユーティリティ。
 */

import {
  LOGO_DEFAULT_COLOR,
  LOGO_MIN_CONTRAST,
  getState,
} from '../context.js';

export function getLogoState() {
  return getState();
}

export function issueLogoJobId() {
  const state = getLogoState();
  state.logoJobId += 1;
  return state.logoJobId;
}

export function applyLogoAssetState({ asset, color, structuralColor, structuralContrast, structuralBlend, fallback, file }) {
  const state = getLogoState();
  const previousAsset = state.logoAsset;
  state.logoAsset = asset;
  state.logoColor = color;
  state.logoColorReady = true;
  state.logoStructuralColor = structuralColor;
  state.logoStructuralContrast = structuralContrast;
  state.logoStructuralBlend = structuralBlend;
  state.logoAccentFallback = fallback;
  state.logoFileName = file?.name || '';
  state.logoFileSize = file?.size || 0;
  state.logoFileType = asset?.mimeType || '';
  return previousAsset;
}

export function resetLogoStateValues() {
  const state = getLogoState();
  const previousAsset = state.logoAsset;
  state.logoAsset = null;
  state.logoColor = LOGO_DEFAULT_COLOR;
  state.logoColorReady = false;
  state.logoPriority = false;
  state.logoColorMode = 'faithful';
  state.logoEnabled = false;
  state.logoStructuralColor = LOGO_DEFAULT_COLOR;
  state.logoStructuralContrast = LOGO_MIN_CONTRAST;
  state.logoStructuralBlend = 0;
  state.logoAccentFallback = false;
  state.logoFileName = '';
  state.logoFileSize = 0;
  state.logoFileType = '';
  return previousAsset;
}

export function setLogoPriority(enabled) {
  const state = getLogoState();
  state.logoPriority = !!enabled;
}

export function getLogoColorMode() {
  const state = getLogoState();
  return state.logoColorMode || 'faithful';
}

export function setLogoColorMode(mode) {
  const state = getLogoState();
  const normalized = mode === 'safe' ? 'safe' : 'faithful';
  state.logoColorMode = normalized;
  return normalized;
}

export function setLogoEnabled(enabled) {
  const state = getLogoState();
  state.logoEnabled = !!enabled;
}

export function isLogoEnabled(state = getLogoState()) {
  return !!state.logoEnabled;
}

export function getStructuralColorForDisplay(state = getLogoState()) {
  if (!state.logoPriority) {
    return LOGO_DEFAULT_COLOR;
  }
  return state.logoStructuralColor || LOGO_DEFAULT_COLOR;
}
