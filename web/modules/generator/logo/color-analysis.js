/**
 * ロゴカラー抽出と解析ロジック。
 */

import {
  LOGO_BACKGROUND_COLOR,
  LOGO_DEFAULT_COLOR,
  LOGO_MAX_BLEND,
  LOGO_MIN_CONTRAST,
  LOGO_MIN_LUMINANCE,
  CANVAS_MAX_DIMENSION,
} from '../context.js';
import {
  blendTowards,
  computeContrast,
  computeRelativeLuminance,
  formatHex,
  hexToRgb,
  rgbToHex,
  toHex,
} from './contrast.js';

export async function extractLogoColorFromImage(image) {
  const { canvas, context } = createSampleCanvas(image);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return getCentralSample(context, canvas);
}

export function ensureLogoColor(hex) {
  const formatted = formatHex(hex);
  const luminance = computeRelativeLuminance(formatted);
  if (!Number.isFinite(luminance) || luminance < LOGO_MIN_LUMINANCE) {
    return { color: LOGO_DEFAULT_COLOR, warning: true };
  }
  return { color: formatted, warning: false };
}

export function deriveLogoAccentDark(hex, backgroundHex, { minContrast = LOGO_MIN_CONTRAST, maxBlend = LOGO_MAX_BLEND } = {}) {
  const normalized = formatHex(hex);
  const backgroundNormalized = formatHex(backgroundHex);
  const baseLuminance = computeRelativeLuminance(normalized);
  const backgroundLuminance = computeRelativeLuminance(backgroundNormalized);
  const baseContrast = computeContrast(baseLuminance, backgroundLuminance);

  if (baseContrast >= minContrast) {
    return {
      color: normalized,
      fallback: false,
      contrast: baseContrast,
      blendRatio: 0,
    };
  }

  const clampedMax = Math.max(0, Math.min(1, maxBlend));
  const rgb = hexToRgb(normalized);
  const target = { r: 0, g: 0, b: 0 };

  const maxMixed = blendTowards(rgb, target, clampedMax);
  const maxMixedHex = rgbToHex(maxMixed.r, maxMixed.g, maxMixed.b);
  const maxMixedContrast = computeContrast(
    computeRelativeLuminance(maxMixedHex),
    backgroundLuminance,
  );

  if (maxMixedContrast < minContrast) {
    const fallbackContrast = computeContrast(
      computeRelativeLuminance(LOGO_DEFAULT_COLOR),
      backgroundLuminance,
    );
    return {
      color: LOGO_DEFAULT_COLOR,
      fallback: true,
      contrast: fallbackContrast,
      blendRatio: 1,
    };
  }

  let low = 0;
  let high = clampedMax;
  let bestRatio = clampedMax;
  let bestHex = maxMixedHex;
  let bestContrast = maxMixedContrast;

  for (let step = 0; step < 18; step += 1) {
    const ratio = (low + high) / 2;
    const mixed = blendTowards(rgb, target, ratio);
    const mixedHex = rgbToHex(mixed.r, mixed.g, mixed.b);
    const mixedContrast = computeContrast(
      computeRelativeLuminance(mixedHex),
      backgroundLuminance,
    );

    if (mixedContrast >= minContrast) {
      bestRatio = ratio;
      bestHex = mixedHex;
      bestContrast = mixedContrast;
      high = ratio;
    } else {
      low = ratio;
    }
  }

  return {
    color: formatHex(bestHex),
    fallback: false,
    contrast: bestContrast,
    blendRatio: bestRatio,
  };
}

export function buildStructuralColorProfile(hex, {
  mode = 'faithful',
  backgroundHex = LOGO_BACKGROUND_COLOR,
  minContrast = LOGO_MIN_CONTRAST,
  maxBlend = LOGO_MAX_BLEND,
} = {}) {
  const normalizedMode = mode === 'safe' ? 'safe' : 'faithful';
  if (normalizedMode === 'safe') {
    return deriveLogoAccentDark(hex, backgroundHex, { minContrast, maxBlend });
  }
  return {
    color: formatHex(hex),
    fallback: false,
    contrast: null,
    blendRatio: 0,
  };
}

export function createSampleCanvas(image) {
  const imgWidth = image.naturalWidth || image.width || CANVAS_MAX_DIMENSION;
  const imgHeight = image.naturalHeight || image.height || CANVAS_MAX_DIMENSION;
  const longest = Math.max(imgWidth, imgHeight);
  const maxDim = Math.max(1, Math.min(CANVAS_MAX_DIMENSION, longest));
  const scale = longest > 0 ? Math.min(1, maxDim / longest) : 1;
  const width = Math.max(1, Math.round(imgWidth * scale));
  const height = Math.max(1, Math.round(imgHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  return { canvas, context };
}

export function getCentralSample(context, canvas) {
  const sampleWidth = Math.max(1, Math.round(canvas.width * 0.5));
  const sampleHeight = Math.max(1, Math.round(canvas.height * 0.5));
  const startX = Math.max(0, Math.floor((canvas.width - sampleWidth) / 2));
  const startY = Math.max(0, Math.floor((canvas.height - sampleHeight) / 2));
  const imageData = context.getImageData(startX, startY, sampleWidth, sampleHeight);
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha < 32) {
      continue;
    }
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    count += 1;
  }
  if (!count) {
    return LOGO_DEFAULT_COLOR;
  }
  const avgR = Math.round(r / count);
  const avgG = Math.round(g / count);
  const avgB = Math.round(b / count);
  return formatHex(`#${toHex(avgR)}${toHex(avgG)}${toHex(avgB)}`);
}

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image-load-failed'));
    img.src = url;
  });
}

export { formatHex } from './contrast.js';
