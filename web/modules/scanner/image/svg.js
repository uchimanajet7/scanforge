/**
 * SVG メタデータ関連ユーティリティ。
 */

import { logger } from '../../core/logger.js';
import {
  MAX_CANVAS_SIDE,
  MAX_SVG_CANVAS_SIDE,
  DEFAULT_SVG_RENDER_SIZE,
} from './constants.js';

export function isSvgFile(file) {
  if (!file) {
    return false;
  }
  const type = (file.type || '').toLowerCase();
  if (type === 'image/svg+xml') {
    return true;
  }
  const name = String(file.name || '').toLowerCase();
  return name.endsWith('.svg');
}

export async function readSvgMetadata(file, signal) {
  try {
    if (signal?.aborted) {
      throw new Error('aborted');
    }
    const text = await file.text();
    if (signal?.aborted) {
      throw new Error('aborted');
    }
    const metadata = extractSvgMetadata(text);
    if (metadata) {
      return metadata;
    }
  } catch (error) {
    if (error.message !== 'aborted') {
      logger.warn('SVG メタデータの解析に失敗', error);
    }
  }

  return {
    width: DEFAULT_SVG_RENDER_SIZE,
    height: DEFAULT_SVG_RENDER_SIZE,
    maxSide: Math.max(MAX_CANVAS_SIDE, DEFAULT_SVG_RENDER_SIZE),
  };
}

export function extractSvgMetadata(svgText) {
  if (typeof DOMParser === 'undefined') {
    return null;
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, 'image/svg+xml');
    const svg = doc.documentElement;

    if (!svg || svg.nodeName.toLowerCase() !== 'svg') {
      return null;
    }

    const widthAttr = svg.getAttribute('width');
    const heightAttr = svg.getAttribute('height');
    const viewBoxAttr = svg.getAttribute('viewBox');

    let width = parseSvgLength(widthAttr);
    let height = parseSvgLength(heightAttr);
    let viewBoxWidth = null;
    let viewBoxHeight = null;

    if (typeof viewBoxAttr === 'string' && viewBoxAttr.trim()) {
      const parts = viewBoxAttr.replace(/,/g, ' ').trim().split(/\s+/);
      if (parts.length === 4) {
        const vbWidth = parseFloat(parts[2]);
        const vbHeight = parseFloat(parts[3]);
        if (Number.isFinite(vbWidth) && vbWidth > 0) {
          viewBoxWidth = vbWidth;
        }
        if (Number.isFinite(vbHeight) && vbHeight > 0) {
          viewBoxHeight = vbHeight;
        }
      }
    }

    if ((!width || !height) && viewBoxWidth && viewBoxHeight) {
      width = width || viewBoxWidth;
      height = height || viewBoxHeight;
    }

    if ((!width || !height) && viewBoxWidth && viewBoxHeight) {
      const ratio = viewBoxWidth / viewBoxHeight;
      if (!width && height) {
        width = height * ratio;
      } else if (!height && width) {
        height = width / ratio;
      }
    }

    if (!width || !height) {
      const fallback = viewBoxWidth && viewBoxHeight
        ? Math.max(viewBoxWidth, viewBoxHeight)
        : DEFAULT_SVG_RENDER_SIZE;
      width = width || fallback;
      height = height || fallback;
    }

    const safeWidth = Number.isFinite(width) && width > 0 ? width : DEFAULT_SVG_RENDER_SIZE;
    const safeHeight = Number.isFinite(height) && height > 0 ? height : DEFAULT_SVG_RENDER_SIZE;
    const maxSide = Math.max(safeWidth, safeHeight);
    const maxSideLimit = Math.max(
      MAX_CANVAS_SIDE,
      Math.min(MAX_SVG_CANVAS_SIDE, maxSide)
    );

    return {
      width: safeWidth,
      height: safeHeight,
      maxSide: maxSideLimit,
    };
  } catch (error) {
    logger.warn('SVG テキスト解析エラー', error);
    return null;
  }
}

export function parseSvgLength(value) {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const match = trimmed.match(/^([-+]?\d*\.?\d+)([a-z%]*)$/i);
  if (!match) {
    return null;
  }

  const number = parseFloat(match[1]);
  if (!Number.isFinite(number) || number <= 0) {
    return null;
  }

  const unit = (match[2] || 'px').toLowerCase();
  return convertSvgUnitToPx(number, unit);
}

export function convertSvgUnitToPx(value, unit) {
  switch (unit) {
    case '':
    case 'px':
      return value;
    case 'in':
      return value * 96;
    case 'cm':
      return value * (96 / 2.54);
    case 'mm':
      return value * (96 / 25.4);
    case 'pt':
      return value * (96 / 72);
    case 'pc':
      return value * 16;
    default:
      return null;
  }
}
