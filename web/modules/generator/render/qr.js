/**
 * QR コード描画処理。
 */

import { toBwipFormat } from '../../data/formats/catalog.js';
import { LOGO_DEFAULT_COLOR, QR_FORMAT_INFO_INDEX } from '../context.js';
import {
  deriveVersionFromModuleCount,
  buildFinderPatternBounds,
  buildAlignmentPatternBounds,
  QR_GEOMETRY,
} from '../qr-geometry.js';
import { formatHex } from '../logo/manager.js';
import { applyLogoOverlay } from './logo.js';
import { buildQrSvg } from './svg.js';

export async function renderQrCode({
  text,
  quietModules,
  includeText,
  transparent,
  logoActive,
  logoColor,
  logoStructuralColor,
  logoStructuralContrast,
  logoStructuralBlend,
  targetSizePx,
  output,
  logoAsset,
  logoEnabled = false,
}) {
  const options = {
    bcid: toBwipFormat('qr_code'),
    text,
    scale: 1,
    includetext: includeText,
    textxalign: 'center',
    paddingwidth: quietModules,
    paddingheight: quietModules,
    eclevel: 'H',
  };

  if (!transparent) {
    options.backgroundcolor = 'ffffff';
  }

  const metricCanvas = document.createElement('canvas');
  await window.bwipjs.toCanvas(metricCanvas, options);

  const baseWidth = Math.max(1, metricCanvas.width);
  const { matrix, moduleCount } = buildModuleMatrix(metricCanvas, quietModules);

  const scale = Math.max(1, Math.min(10, Math.round(targetSizePx / baseWidth)));
  const structuralMask = buildStructuralMask(moduleCount);

  const dataColor = logoActive ? formatHex(logoColor) : LOGO_DEFAULT_COLOR;
  const structuralColor = logoActive ? formatHex(logoStructuralColor) : LOGO_DEFAULT_COLOR;
  const structuralContrastValue = logoActive ? logoStructuralContrast : null;
  const structuralBlendValue = logoActive ? logoStructuralBlend : null;

  const canvas = drawQrCanvas({
    matrix,
    structuralMask,
    moduleSize: scale,
    quietModules,
    logoActive,
    logoColor: dataColor,
    structuralColor,
    transparent,
  });

  if (logoEnabled && logoAsset) {
    applyLogoOverlay(canvas, logoAsset);
  }

  const svgText = buildQrSvg({
    matrix,
    structuralMask,
    moduleSize: scale,
    quietModules,
    logoActive,
    logoColor: dataColor,
    structuralColor,
    transparent,
    logoEnabled,
    logoAsset: logoEnabled ? logoAsset : null,
  });

  let pngBlob = null;
  if (output === 'png') {
    pngBlob = await new Promise(resolve => {
      canvas.toBlob(blob => resolve(blob), 'image/png');
    });
  }

  return {
    canvas,
    svgText,
    pngBlob,
    logoActive,
    logoColor: dataColor,
    logoStructuralColor: structuralColor,
    logoStructuralContrast: structuralContrastValue,
    logoStructuralBlend: structuralBlendValue,
    scale,
  };
}

function buildModuleMatrix(canvas, quietModules) {
  const width = canvas.width;
  const height = canvas.height;
  if (width !== height) {
    throw new Error('qr-matrix-non-square');
  }
  const totalModules = width;
  const moduleCount = totalModules - quietModules * 2;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    throw new Error('canvas-context-unavailable');
  }
  const imageData = context.getImageData(0, 0, width, height).data;
  const matrix = [];
  for (let y = 0; y < moduleCount; y += 1) {
    const row = new Array(moduleCount);
    for (let x = 0; x < moduleCount; x += 1) {
      const pixelX = quietModules + x;
      const pixelY = quietModules + y;
      const idx = (pixelY * width + pixelX) * 4;
      const r = imageData[idx];
      const g = imageData[idx + 1];
      const b = imageData[idx + 2];
      const a = imageData[idx + 3];
      const brightness = (r + g + b) / 3;
      const isDark = a > 0 && brightness < 128;
      row[x] = isDark;
    }
    matrix.push(row);
  }
  return { matrix, moduleCount };
}

function buildStructuralMask(moduleCount) {
  const mask = new Set();
  buildFinderPatternBounds(moduleCount).forEach(bounds => {
    for (let y = bounds.y0; y <= bounds.y1; y += 1) {
      for (let x = bounds.x0; x <= bounds.x1; x += 1) {
        mask.add(moduleKey(x, y));
      }
    }
  });

  const timingIndex = QR_GEOMETRY.TIMING_INDEX;
  for (let i = 0; i < moduleCount; i += 1) {
    mask.add(moduleKey(i, timingIndex));
    mask.add(moduleKey(timingIndex, i));
  }

  const version = deriveVersionFromModuleCount(moduleCount);
  if (Number.isInteger(version) && version >= 2) {
    buildAlignmentPatternBounds(version, moduleCount).forEach(bounds => {
      for (let y = bounds.y0; y <= bounds.y1; y += 1) {
        for (let x = bounds.x0; x <= bounds.x1; x += 1) {
          mask.add(moduleKey(x, y));
        }
      }
    });
  }

  addFormatInfoModules(mask, moduleCount);
  return mask;
}

function addFormatInfoModules(mask, moduleCount) {
  const idx = QR_FORMAT_INFO_INDEX;
  for (let i = 0; i <= 8; i += 1) {
    if (i === QR_GEOMETRY.TIMING_INDEX) {
      continue;
    }
    mask.add(moduleKey(i, idx));
    mask.add(moduleKey(idx, i));
  }
  for (let offset = 0; offset < 8; offset += 1) {
    const position = moduleCount - 1 - offset;
    mask.add(moduleKey(position, idx));
    mask.add(moduleKey(idx, position));
  }
}

function moduleKey(x, y) {
  return `${x},${y}`;
}

function drawQrCanvas({
  matrix,
  structuralMask,
  moduleSize,
  quietModules,
  logoActive,
  logoColor,
  structuralColor,
  transparent,
}) {
  const moduleCount = matrix.length;
  const totalModules = moduleCount + quietModules * 2;
  const size = totalModules * moduleSize;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('canvas-context-unavailable');
  }
  context.imageSmoothingEnabled = false;
  if (!transparent) {
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, size, size);
  } else {
    context.clearRect(0, 0, size, size);
  }

  const inkColor = logoActive ? logoColor : LOGO_DEFAULT_COLOR;
  const structureColor = logoActive ? structuralColor : LOGO_DEFAULT_COLOR;

  for (let y = 0; y < moduleCount; y += 1) {
    for (let x = 0; x < moduleCount; x += 1) {
      if (!matrix[y][x]) {
        continue;
      }
      const drawX = (quietModules + x) * moduleSize;
      const drawY = (quietModules + y) * moduleSize;
      const isStructural = structuralMask.has(moduleKey(x, y));
      context.fillStyle = isStructural ? structureColor : inkColor;
      context.fillRect(drawX, drawY, moduleSize, moduleSize);
    }
  }
  return canvas;
}
