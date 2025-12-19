/**
 * ロゴプレビュー表示の制御。
 */

import { elements } from '../dom-cache.js';
import { setLogoPreviewState } from './ui.js';

export function renderLogoPreview(asset) {
  if (!elements.logoPreviewFrame || !elements.logoPreviewImage) {
    return;
  }
  if (!asset?.dataUrl) {
    clearLogoPreview();
    return;
  }
  elements.logoPreviewImage.src = asset.dataUrl;
  setLogoPreviewState('ready');
}

export function clearLogoPreview() {
  if (elements.logoPreviewImage) {
    elements.logoPreviewImage.removeAttribute('src');
  }
  setLogoPreviewState('empty');
}
