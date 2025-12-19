/**
 * QR コード SVG 生成ユーティリティ。
 */

import { LOGO_DEFAULT_COLOR } from '../context.js';
import { computeLogoMetrics } from './logo.js';

export function buildQrSvg({
  matrix,
  structuralMask,
  moduleSize,
  quietModules,
  logoActive,
  logoColor,
  structuralColor,
  transparent,
  logoAsset,
  logoEnabled = false,
}) {
  const moduleCount = matrix.length;
  const totalModules = moduleCount + quietModules * 2;
  const size = totalModules * moduleSize;
  const parts = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">`);

  if (!transparent) {
    parts.push(`<rect width="${size}" height="${size}" fill="#FFFFFF"/>`);
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
      const fill = structuralMask.has(`${x},${y}`) ? structureColor : inkColor;
      parts.push(`<rect x="${formatSvgNumber(drawX)}" y="${formatSvgNumber(drawY)}" width="${moduleSize}" height="${moduleSize}" fill="${fill}"/>`);
    }
  }

  if (logoEnabled && logoAsset?.dataUrl) {
    const metrics = computeLogoMetrics(size, logoAsset);
    const clipId = `logo-clip-${Math.random().toString(36).slice(2, 10)}`;
    parts.push('<defs>');
    parts.push(`<clipPath id="${clipId}"><circle cx="${formatSvgNumber(metrics.centerX)}" cy="${formatSvgNumber(metrics.centerY)}" r="${formatSvgNumber(metrics.clipRadius)}"/></clipPath>`);
    parts.push('</defs>');
    parts.push(`<circle cx="${formatSvgNumber(metrics.centerX)}" cy="${formatSvgNumber(metrics.centerY)}" r="${formatSvgNumber(metrics.badgeRadius)}" fill="#FFFFFF"/>`);
    parts.push(`<image href="${logoAsset.dataUrl}" xlink:href="${logoAsset.dataUrl}" x="${formatSvgNumber(metrics.imageX)}" y="${formatSvgNumber(metrics.imageY)}" width="${formatSvgNumber(metrics.drawWidth)}" height="${formatSvgNumber(metrics.drawHeight)}" clip-path="url(#${clipId})" preserveAspectRatio="xMidYMid meet"/>`);
  }

  parts.push('</svg>');
  return parts.join('');
}

export function formatSvgNumber(value) {
  if (Number.isInteger(value)) {
    return String(value);
  }
  return value.toFixed(2).replace(/\.?0+$/, '');
}
