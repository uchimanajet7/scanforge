/**
 * ロゴアセットの生成・破棄処理。
 */

import { sanitizeSvgText } from './svg-sanitizer.js';
import { loadImage } from './color-analysis.js';

export async function createLogoAssetFromPng(file) {
  const originalUrl = URL.createObjectURL(file);
  try {
    const originalImage = await loadImage(originalUrl);
    const width = originalImage.naturalWidth || originalImage.width;
    const height = originalImage.naturalHeight || originalImage.height;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
      throw new Error('canvas-context-unavailable');
    }
    context.drawImage(originalImage, 0, 0, width, height);
    const sanitizedBlob = await new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('png-sanitize-failed'));
        }
      }, 'image/png');
    });
    const dataUrl = await blobToDataUrl(sanitizedBlob);
    let sanitizedUrl = '';
    try {
      sanitizedUrl = URL.createObjectURL(sanitizedBlob);
      const sanitizedImage = await loadImage(sanitizedUrl);
      return {
        blob: sanitizedBlob,
        dataUrl,
        mimeType: 'image/png',
        type: 'png',
        width: sanitizedImage.naturalWidth || sanitizedImage.width,
        height: sanitizedImage.naturalHeight || sanitizedImage.height,
        image: sanitizedImage,
        objectUrl: sanitizedUrl,
        svgText: null,
      };
    } catch (error) {
      if (sanitizedUrl) {
        URL.revokeObjectURL(sanitizedUrl);
      }
      throw error;
    }
  } finally {
    URL.revokeObjectURL(originalUrl);
  }
}

export async function createLogoAssetFromSvg(file) {
  const text = await file.text();
  const sanitized = sanitizeSvgText(text);
  const blob = new Blob([sanitized], { type: 'image/svg+xml' });
  const dataUrl = await blobToDataUrl(blob);
  let objectUrl = '';
  try {
    objectUrl = URL.createObjectURL(blob);
    const image = await loadImage(objectUrl);
    return {
      blob,
      dataUrl,
      mimeType: 'image/svg+xml',
      type: 'svg',
      width: image.naturalWidth || image.width || 0,
      height: image.naturalHeight || image.height || 0,
      image,
      objectUrl,
      svgText: sanitized,
    };
  } catch (error) {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
    throw error;
  }
}

export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('dataurl-failed'));
      }
    };
    reader.onerror = () => {
      reject(new Error('dataurl-failed'));
    };
    reader.readAsDataURL(blob);
  });
}

export function disposeLogoAsset(asset) {
  if (!asset) {
    return;
  }
  if (asset.objectUrl) {
    URL.revokeObjectURL(asset.objectUrl);
  }
}
