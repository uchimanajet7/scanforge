/**
 * 汎用バーコード描画処理。
 */

import { toBwipFormat } from '../../data/formats/catalog.js';
import { LOGO_DEFAULT_COLOR } from '../context.js';
import { logger } from '../feedback.js';

export function ensureBwipReady() {
  if (window?.bwipjs) {
    return true;
  }
  logger.warn('generator:bwip-not-ready');
  return false;
}

export async function renderGenericBarcode({
  text,
  formatKey,
  output,
  includeText,
  transparent,
  quietModules,
  targetSizePx,
}) {
  const bwipFormat = toBwipFormat(formatKey);
  const baseOptions = {
    bcid: bwipFormat,
    text,
    scale: 1,
    includetext: includeText,
    textxalign: 'center',
    paddingwidth: quietModules,
    paddingheight: quietModules,
  };

  if (!transparent) {
    baseOptions.backgroundcolor = 'ffffff';
  }

  const baseCanvas = document.createElement('canvas');
  await window.bwipjs.toCanvas(baseCanvas, baseOptions);

  const baseWidth = Math.max(1, baseCanvas.width);
  const scale = Math.max(1, Math.min(10, Math.round(targetSizePx / baseWidth)));

  const finalOptions = {
    ...baseOptions,
    scale,
  };

  const previewCanvas = document.createElement('canvas');
  await window.bwipjs.toCanvas(previewCanvas, finalOptions);

  const meta = {
    mode: '通常モード',
    logoColor: LOGO_DEFAULT_COLOR,
    logoStructuralColor: LOGO_DEFAULT_COLOR,
    logoColors: {
      data: LOGO_DEFAULT_COLOR,
      structural: LOGO_DEFAULT_COLOR,
    },
    format: formatKey,
    scale,
    quietModules,
  };

  const result = {
    format: formatKey,
    output,
    logoPriority: false,
    logoColor: LOGO_DEFAULT_COLOR,
    logoStructuralColor: LOGO_DEFAULT_COLOR,
    width: previewCanvas.width,
    height: previewCanvas.height,
    meta,
    svgText: null,
    pngBlob: null,
  };

  if (output === 'svg') {
    result.svgText = window.bwipjs.toSVG(finalOptions);
  } else {
    result.pngBlob = await new Promise(resolve => {
      previewCanvas.toBlob(blob => resolve(blob), 'image/png');
    });
  }

  return { canvas: previewCanvas, result };
}
