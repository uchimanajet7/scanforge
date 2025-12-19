/**
 * キャンバス生成と変換ユーティリティ。
 */

import {
  MAX_CANVAS_SIDE,
} from './constants.js';
import { ImageScanError } from './errors.js';

export function createScaledCanvas(source, options = {}) {
  const dimensions = getSourceDimensions(source);
  const preferredWidth = Number(options.preferredWidth) > 0 ? Number(options.preferredWidth) : null;
  const preferredHeight = Number(options.preferredHeight) > 0 ? Number(options.preferredHeight) : null;
  const baseWidth = preferredWidth || dimensions.width;
  const baseHeight = preferredHeight || dimensions.height;
  const maxSideLimit = Number(options.maxSide) > 0 ? Number(options.maxSide) : MAX_CANVAS_SIDE;
  const maxSide = Math.max(baseWidth, baseHeight, 1);
  const scale = maxSide > maxSideLimit ? maxSideLimit / maxSide : 1;

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(baseWidth * scale));
  canvas.height = Math.max(1, Math.round(baseHeight * scale));

  const context = canvas.getContext('2d', { willReadFrequently: true, alpha: true });
  if (!context) {
    throw new ImageScanError('キャンバスコンテキストを取得できませんでした。', 'canvas-context');
  }

  return { canvas, context };
}

export function drawSourceToCanvas(source, context, canvas) {
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
}

export function getSourceDimensions(source) {
  const width = typeof source.width === 'number'
    ? source.width
    : Number(source.naturalWidth) || 0;
  const height = typeof source.height === 'number'
    ? source.height
    : Number(source.naturalHeight) || 0;
  return {
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height)),
  };
}

export function canvasToImage(canvas) {
  return new Promise((resolve, reject) => {
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => resolve(image);
      image.onerror = () => reject(new ImageScanError('キャンバス変換に失敗しました。', 'canvas-convert'));
      image.src = dataUrl;
    } catch (error) {
      reject(new ImageScanError('キャンバス変換に失敗しました。', 'canvas-convert', { cause: error }));
    }
  });
}

export function buildBoundingBox(points, canvas) {
  if (!Array.isArray(points) || points.length === 0) {
    return null;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  points.forEach(point => {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  });

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
  };
}
