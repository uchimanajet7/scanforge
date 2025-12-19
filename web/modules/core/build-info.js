/**
 * ビルド情報管理のエントリーポイント。
 */

import { generateBuildInfo } from './build-info/generate.js';
import { formatBuildDetails, formatBuildLabel } from './build-info/format.js';
import { publishBuildInfo } from './build-info/publish.js';
import {
  resolveStylesheetVersion as resolveStylesheetVersionInternal,
  applyStylesheetCacheBust as applyStylesheetCacheBustInternal,
} from './build-info/cache-bust.js';
import { validateBuildInfo } from './build-info/validate.js';

export const BUILD_INFO = Object.freeze(generateBuildInfo());

export {
  generateBuildInfo,
  formatBuildDetails,
  formatBuildLabel,
  publishBuildInfo,
  validateBuildInfo,
};

export function resolveStylesheetVersion(info = BUILD_INFO) {
  return resolveStylesheetVersionInternal(info);
}

export function applyStylesheetCacheBust(options) {
  return applyStylesheetCacheBustInternal(BUILD_INFO, options);
}

export function applyStylesheetCacheBustFor(info, options) {
  return applyStylesheetCacheBustInternal(info, options);
}

export function resolveStylesheetVersionFor(info) {
  return resolveStylesheetVersionInternal(info);
}
