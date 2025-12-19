/**
 * DOMクエリ機能
 *
 * 要素検索とキャッシュ管理を担当する。
 */

import { logger } from '../../../core/logger.js';

/**
 * 要素キャッシュ
 * @type {Map<string, Element|NodeList|null>}
 */
const elementCache = new Map();

/**
 * 要素を取得（キャッシュ付き）
 * @param {string} selector - セレクタ
 * @param {Element|Document} parent - 親要素
 * @param {boolean} multiple - 複数要素取得フラグ
 * @returns {Element|NodeList|null} 取得結果
 */
export function get(selector, parent = document, multiple = false) {
  const scopeKey = parent === document ? 'doc' : 'el';
  const cacheKey = `${scopeKey}:${selector}:${multiple}`;

  if (elementCache.has(cacheKey)) {
    const cached = elementCache.get(cacheKey);

    if (!multiple && cached instanceof Element) {
      if (cached.isConnected) {
        return cached;
      }
      elementCache.delete(cacheKey);
    } else if (multiple && cached) {
      const items = Array.from(cached);
      if (items.length > 0 && items.every(node => node.isConnected)) {
        return cached;
      }
      elementCache.delete(cacheKey);
    } else if (cached == null) {
      elementCache.delete(cacheKey);
    } else {
      return cached;
    }
  }

  const element = multiple
    ? parent.querySelectorAll(selector)
    : parent.querySelector(selector);

  if (element && (!multiple || (multiple && element.length > 0))) {
    elementCache.set(cacheKey, element);
  }

  return element;
}

/**
 * 要素を強制取得
 * @param {string} selector - セレクタ
 * @param {Element|Document} parent - 親要素
 * @returns {Element} 要素
 */
export function require(selector, parent = document) {
  const element = get(selector, parent);
  if (!element) {
    const error = new Error(`必須要素が見つかりません: ${selector}`);
    logger.error('dom:require:not-found', { selector, error });
    throw error;
  }
  return element;
}

/**
 * セレクタマップから要素群を取得
 * @param {Object<string, string>} selectors - セレクタマップ
 * @param {Element|Document} parent - 親要素
 * @returns {Object<string, Element|null>} 要素マップ
 */
export function getAll(selectors, parent = document) {
  const result = {};
  for (const [key, selector] of Object.entries(selectors)) {
    result[key] = get(selector, parent);
  }
  return result;
}

/**
 * 要素キャッシュをクリア
 */
export function clearCache() {
  elementCache.clear();
}

export default {
  get,
  require,
  getAll,
  clearCache,
};
