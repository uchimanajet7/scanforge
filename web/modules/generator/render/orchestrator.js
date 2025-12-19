/**
 * レンダリング機能の統合ポイント。
 */

import { ensureBwipReady as ensureBwipReadyInternal, renderGenericBarcode } from './barcode.js';
import { renderQrCode } from './qr.js';
import { buildDownloadName } from './naming.js';
import { renderPreviewCanvas } from '../preview/render.js';
import { getState } from '../context.js';

export async function renderBarcode({
  text,
  formatKey,
  output,
  includeText,
  transparent,
  quietModules,
  targetSizePx,
}) {
  const state = getState();
  const logoIntent = formatKey === 'qr_code' && state.logoPriority;
  const logoActive = logoIntent && state.logoColorReady;
  const logoEnabled = formatKey === 'qr_code' && state.logoEnabled;

  let transparentBackground = transparent;
  if (logoIntent) {
    transparentBackground = false;
  }

  if (formatKey === 'qr_code') {
    const qrResult = await renderQrCode({
      text,
      quietModules,
      includeText,
      transparent: transparentBackground,
      logoActive,
      logoColor: state.logoColor,
      logoStructuralColor: state.logoStructuralColor,
      logoStructuralContrast: state.logoStructuralContrast,
      logoStructuralBlend: state.logoStructuralBlend,
      targetSizePx,
      output,
      logoAsset: logoEnabled ? state.logoAsset : null,
      logoEnabled,
    });

    const meta = {
      mode: qrResult.logoActive ? 'ロゴ優先モード' : '通常モード',
      logoColor: qrResult.logoColor,
      logoStructuralColor: qrResult.logoStructuralColor,
      logoColors: {
        data: qrResult.logoColor,
        structural: qrResult.logoStructuralColor,
        contrast: qrResult.logoStructuralContrast,
        blendRatio: qrResult.logoStructuralBlend,
      },
      format: formatKey,
      scale: qrResult.scale,
      quietModules,
    };

    const result = {
      format: formatKey,
      output,
      logoPriority: qrResult.logoActive,
      logoColor: qrResult.logoColor,
      logoStructuralColor: qrResult.logoStructuralColor,
      logoStructuralContrast: qrResult.logoStructuralContrast,
      logoStructuralBlend: qrResult.logoStructuralBlend,
      width: qrResult.canvas.width,
      height: qrResult.canvas.height,
      meta,
      svgText: output === 'svg' ? qrResult.svgText : null,
      pngBlob: output === 'png' ? qrResult.pngBlob : null,
    };

    renderPreviewCanvas(qrResult.canvas);
    return result;
  }

  const genericResult = await renderGenericBarcode({
    text,
    formatKey,
    output,
    includeText,
    transparent: transparentBackground,
    quietModules,
    targetSizePx,
  });

  renderPreviewCanvas(genericResult.canvas);
  return genericResult.result;
}

export function ensureBwipReady() {
  return ensureBwipReadyInternal();
}

export { buildDownloadName };
