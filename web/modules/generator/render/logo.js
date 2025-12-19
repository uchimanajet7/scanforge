/**
 * QR コードへのロゴ合成ユーティリティ。
 */

import { LOGO_BADGE_PADDING, LOGO_SIZE_RATIO } from '../context.js';

export function applyLogoOverlay(canvas, asset) {
  if (!asset?.image || !asset.dataUrl) {
    return;
  }

  const context = canvas.getContext('2d');
  if (!context) {
    return;
  }

  context.save();
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';

  const metrics = computeLogoMetrics(canvas.width, asset);
  context.fillStyle = '#FFFFFF';
  context.beginPath();
  context.arc(metrics.centerX, metrics.centerY, metrics.badgeRadius, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.arc(metrics.centerX, metrics.centerY, metrics.clipRadius, 0, Math.PI * 2);
  context.clip();
  context.drawImage(
    asset.image,
    metrics.imageX,
    metrics.imageY,
    metrics.drawWidth,
    metrics.drawHeight,
  );

  context.restore();
}

export function computeLogoMetrics(totalSize, asset) {
  const size = Math.max(totalSize, 1);
  const target = Math.max(1, Math.round(size * LOGO_SIZE_RATIO));
  const badgeRadius = Math.round(target / 2 + LOGO_BADGE_PADDING);
  const clipRadius = Math.round(target / 2);

  let drawWidth = target;
  let drawHeight = target;

  if (asset.width && asset.height) {
    const scale = Math.min(target / asset.width, target / asset.height, 1);
    drawWidth = Math.max(1, Math.round(asset.width * scale));
    drawHeight = Math.max(1, Math.round(asset.height * scale));
  }

  const centerX = size / 2;
  const centerY = size / 2;
  const imageX = centerX - drawWidth / 2;
  const imageY = centerY - drawHeight / 2;

  return {
    centerX,
    centerY,
    drawWidth,
    drawHeight,
    imageX,
    imageY,
    badgeRadius,
    clipRadius,
  };
}
