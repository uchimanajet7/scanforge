/**
 * ロゴ取り込みと復元処理。
 */

import {
  LOGO_BACKGROUND_COLOR,
  LOGO_FILE_TYPES,
  LOGO_MAX_BLEND,
  LOGO_MIN_CONTRAST,
  FILE_SIZE_LIMIT,
} from '../context.js';
import { logger, toast } from '../feedback.js';
import {
  applyLogoAssetState,
  getLogoState,
  issueLogoJobId,
  resetLogoStateValues,
  setLogoPriority,
  getLogoColorMode,
} from './state.js';
import {
  applyLogoPrioritySideEffects,
  clearLogoInputValue,
  hideLogoMeta,
  setLogoPreviewState,
  setLogoPriorityToggle,
  updateLogoColorUi,
  updateLogoDropState,
  updateLogoPriorityAvailability,
  updateLogoAvailability,
  showLogoMeta,
} from './ui.js';
import {
  renderLogoPreview,
  clearLogoPreview,
} from './preview.js';
import {
  createLogoAssetFromPng,
  createLogoAssetFromSvg,
  disposeLogoAsset,
} from './asset-factory.js';
import {
  ensureLogoColor,
  extractLogoColorFromImage,
  formatHex,
  buildStructuralColorProfile,
} from './color-analysis.js';

export function normalizeLogoMimeType(file) {
  if (file.type && LOGO_FILE_TYPES[file.type]) {
    return file.type;
  }
  return detectMimeFromExtension(file.name);
}

export function detectMimeFromExtension(name = '') {
  const lower = String(name).toLowerCase();
  if (lower.endsWith('.png')) {
    return 'image/png';
  }
  if (lower.endsWith('.svg')) {
    return 'image/svg+xml';
  }
  return null;
}

export async function ingestLogo(file, source) {
  const jobId = issueLogoJobId();
  updateLogoDropState('busy');
  setLogoPreviewState(getLogoState().logoAsset ? 'busy' : 'empty');

  try {
    const mimeType = normalizeLogoMimeType(file);
    if (!mimeType) {
      throw new Error('unsupported-type');
    }
    if (file.size > FILE_SIZE_LIMIT) {
      throw new Error('file-too-large');
    }
    const asset = await sanitizeLogo(file, mimeType);
    const colorSample = await extractLogoColorFromImage(asset.image);
    const normalized = formatHex(colorSample);
    const { color, warning } = ensureLogoColor(normalized);

    if (jobId !== getLogoState().logoJobId) {
      disposeLogoAsset(asset);
      setLogoPreviewState(getLogoState().logoAsset ? 'ready' : 'empty');
      return;
    }

    const accent = buildStructuralColorProfile(color, {
      mode: getLogoColorMode(),
      backgroundHex: LOGO_BACKGROUND_COLOR,
      minContrast: LOGO_MIN_CONTRAST,
      maxBlend: LOGO_MAX_BLEND,
    });

    const previousAsset = applyLogoAssetState({
      asset,
      color,
      structuralColor: accent.color,
      structuralContrast: accent.contrast,
      structuralBlend: accent.blendRatio,
      fallback: accent.fallback,
      file,
    });

    disposeLogoAsset(previousAsset);

    updateLogoColorUi({
      data: color,
      structural: getLogoState().logoStructuralColor,
    });
    showLogoMeta(asset);
    updateLogoDropState('ready');
    renderLogoPreview(asset);

    if (warning) {
      toast.warning('抽出した色が暗すぎるため既定色は #000000 を用います。');
      setLogoPriority(false);
      setLogoPriorityToggle(false);
      applyLogoPrioritySideEffects();
    } else if (getLogoState().logoAccentFallback) {
      toast.warning('構造領域は十分なコントラストを確保できないため黒で描画します。');
    } else {
      toast.success('ロゴからロゴカラーを抽出しました。');
    }

    clearLogoInputValue();
  } catch (error) {
    logger.error('generator:logo-ingest-failed', { error, source });
    if (error.message === 'unsupported-type') {
      toast.error('PNG または SVG 形式のロゴを選択してください。');
    } else if (error.message === 'file-too-large') {
      toast.error('ファイルサイズは 2MB 以下にしてください。');
    } else {
      toast.error('ロゴの取り込みに失敗しました。別の画像をお試しください。');
    }
    resetLogoColor();
  } finally {
    updateLogoPriorityAvailability();
    updateLogoAvailability();
  }
}

export async function sanitizeLogo(file, mimeType) {
  if (mimeType === 'image/png') {
    return createLogoAssetFromPng(file);
  }
  if (mimeType === 'image/svg+xml') {
    return createLogoAssetFromSvg(file);
  }
  throw new Error('unsupported-type');
}

export function resetLogoColor() {
  const previousAsset = resetLogoStateValues();
  disposeLogoAsset(previousAsset);
  updateLogoColorUi({
    data: getLogoState().logoColor,
    structural: getLogoState().logoStructuralColor,
  });
  hideLogoMeta();
  updateLogoDropState('idle');
  clearLogoPreview();
  setLogoPriority(false);
  setLogoPriorityToggle(false);
  applyLogoPrioritySideEffects();
  clearLogoInputValue();
  updateLogoPriorityAvailability();
  updateLogoAvailability();
}

export function applyStructuralColorForMode(mode) {
  const state = getLogoState();
  if (!state.logoColorReady) {
    return null;
  }
  const accent = buildStructuralColorProfile(state.logoColor, {
    mode: mode || getLogoColorMode(),
    backgroundHex: LOGO_BACKGROUND_COLOR,
    minContrast: LOGO_MIN_CONTRAST,
    maxBlend: LOGO_MAX_BLEND,
  });
  state.logoStructuralColor = accent.color;
  state.logoStructuralContrast = accent.contrast;
  state.logoStructuralBlend = accent.blendRatio;
  state.logoAccentFallback = accent.fallback;
  updateLogoColorUi({
    data: state.logoColor,
    structural: state.logoStructuralColor,
  });
  return accent;
}
