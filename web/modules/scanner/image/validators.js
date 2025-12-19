/**
 * 画像ファイルの入力バリデーション。
 */

import {
  MAX_FILE_SIZE_BYTES,
  SUPPORTED_MIME_TYPES,
  SUPPORTED_EXTENSIONS,
} from './constants.js';
import { ImageScanError } from './errors.js';

export function validateImageFile(file) {
  if (!(file instanceof File)) {
    throw new ImageScanError('画像ファイルが選択されていません。', 'no-file');
  }

  if (file.size === 0) {
    throw new ImageScanError('空のファイルは解析できません。', 'empty-file');
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new ImageScanError('10MB を超えるファイルは解析できません。', 'file-too-large');
  }

  const mime = (file.type || '').toLowerCase();
  if (SUPPORTED_MIME_TYPES.includes(mime)) {
    return;
  }

  const ext = getFileExtension(file.name);
  if (SUPPORTED_EXTENSIONS.includes(ext)) {
    return;
  }

  throw new ImageScanError('対応していない画像形式です。PNG / JPEG / WebP / SVG を使用してください。', 'unsupported-type');
}

export function getFileExtension(name = '') {
  const index = name.lastIndexOf('.');
  if (index === -1) {
    return '';
  }
  return name.slice(index).toLowerCase();
}
