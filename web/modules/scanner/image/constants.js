/**
 * 画像解析モジュールで利用する定数。
 */

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export const SUPPORTED_MIME_TYPES = Object.freeze([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/svg+xml',
]);

export const SUPPORTED_EXTENSIONS = Object.freeze([
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.svg',
]);

export const MAX_CANVAS_SIDE = 2000;

export const MAX_SVG_CANVAS_SIDE = 4096;

export const DEFAULT_SVG_RENDER_SIZE = 1024;
