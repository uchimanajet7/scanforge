import { getState, updateState } from '../context.js';
import { elements } from '../dom-cache.js';
import { logger } from '../feedback.js';
import { clearPreview } from './render.js';

export function storePreview(result) {
  updateState({ preview: result });
  if (elements.downloadBtn) {
    elements.downloadBtn.disabled = false;
  }
  updatePreviewMeta();
}

export function getStoredPreview() {
  return getState().preview;
}

export function invalidatePreview(message) {
  updateState({ preview: null });
  clearPreview();
  if (elements.downloadBtn) {
    elements.downloadBtn.disabled = true;
  }
  updateCopyActionState(null, elements.outputSelect?.value || 'svg');
  updatePreviewMeta();
  if (message) {
    logger.info('generator:preview:invalidate', { reason: message });
  }
}

export function updatePreviewMeta() {
  if (!elements.previewInfo) {
    return;
  }
  const output = (elements.outputSelect?.value || 'svg').toUpperCase();
  const preview = getState().preview;
  let meta = `出力形式: ${output}`;
  if (preview?.width && preview?.height) {
    meta += ` ／ 実寸: ${preview.width}px × ${preview.height}px`;
  }
  elements.previewInfo.textContent = meta;
}

export function updateCopyActionState(preview, output) {
  if (!elements.copyBtn) {
    return false;
  }
  const variant = (output || 'svg').toLowerCase();
  const label = variant === 'png' ? 'PNG をコピー' : 'SVGコードをコピー';
  elements.copyBtn.textContent = label;
  if (!preview) {
    elements.copyBtn.disabled = true;
    elements.copyBtn.setAttribute('aria-disabled', 'true');
    elements.copyBtn.dataset.copyUnavailable = 'true';
    elements.copyBtn.title = '生成後にコピーできます。';
    logger.debug('generator:copy-state:update', {
      variant,
      reason: 'no-preview',
    });
    return false;
  }
  elements.copyBtn.disabled = false;
  elements.copyBtn.removeAttribute('aria-disabled');

  let hasData = false;
  let canCopy = false;
  const hasSvgData = !!preview.svgText;
  const hasPngBlobData = !!preview.pngBlob;
  let canClipboardPng = null;

  if (variant === 'svg') {
    hasData = hasSvgData;
    canCopy = hasData;
  } else if (variant === 'png') {
    canClipboardPng = canCopyPng();
    hasData = hasPngBlobData;
    canCopy = hasData && canClipboardPng;
  } else {
    logger.debug('generator:copy-state:update', {
      variant,
      reason: 'unsupported-variant',
    });
  }

  if (!hasData) {
    elements.copyBtn.dataset.copyUnavailable = 'true';
    elements.copyBtn.title = 'コピーできるデータがありません。';
    logger.debug('generator:copy-state:update', {
      variant,
      reason: 'no-data',
      hasSvgData,
      hasPngBlobData,
    });
  } else if (variant === 'png' && !canClipboardPng) {
    elements.copyBtn.dataset.copyUnavailable = 'true';
    elements.copyBtn.title = 'ブラウザが画像コピーに対応していません。クリックすると警告を表示します。';
    logger.debug('generator:copy-state:update', {
      variant,
      reason: 'clipboard-unsupported',
      hasSvgData,
      hasPngBlobData,
      canClipboardPng,
    });
  } else {
    elements.copyBtn.removeAttribute('data-copy-unavailable');
    elements.copyBtn.removeAttribute('title');
    logger.debug('generator:copy-state:update', {
      variant,
      reason: 'ready',
      hasSvgData,
      hasPngBlobData,
      canClipboardPng,
    });
  }

  return canCopy;
}

export function canCopyPng() {
  if (typeof navigator === 'undefined') {
    logger.debug('generator:clipboard:navigator-missing');
    return false;
  }
  if (typeof ClipboardItem === 'undefined') {
    logger.debug('generator:clipboard:clipboarditem-undefined');
    return false;
  }
  if (!navigator?.clipboard || typeof navigator.clipboard.write !== 'function') {
    logger.debug('generator:clipboard:write-unsupported', {
      hasClipboard: !!navigator?.clipboard,
      writeType: typeof navigator?.clipboard?.write,
    });
    return false;
  }
  try {
    const testItem = new ClipboardItem({ 'image/png': new Blob([], { type: 'image/png' }) });
    const supported = !!testItem;
    logger.debug('generator:clipboard:testitem', { supported });
    return !!testItem;
  } catch (error) {
    logger.debug('generator:clipboard:testitem-error', { error });
    return false;
  }
}
