/**
 * 履歴領域サブストア
 *
 * 履歴リストの初期状態と操作関数を管理し、
 * グローバル状態を介して履歴表示や永続化モジュールと連携する。
 */

import { logger } from '../logger.js';
import { APP_CONFIG } from '../config/app-settings.js';
import { getState, setState } from './base.js';

/**
 * 履歴の初期状態を生成
 * @returns {{ items: Array, maxItems: number }} 初期状態
 */
export function createDefaultHistoryState() {
  return {
    items: [],
    maxItems: APP_CONFIG.HISTORY_LIMIT,
  };
}

/**
 * 履歴を上限件数内に収める
 * @param {Array<Object>} items - 調整対象の履歴配列
 * @param {number} maxItems - 保持件数上限
 * @returns {Array<Object>} 調整後の履歴配列
 */
function clampHistoryItems(items, maxItems) {
  if (!Array.isArray(items)) {
    return [];
  }
  if (!Number.isInteger(maxItems) || maxItems <= 0) {
    return [...items];
  }

  if (items.length <= maxItems) {
    return [...items];
  }

  const trimmed = items.slice(0, maxItems);
  trimmed.length = maxItems;
  return trimmed;
}

/**
 * 履歴に項目を追加
 * @param {Object} item - 履歴項目
 */
export function addHistoryItem(item) {
  const history = getState('history');
  const maxItems = Number.isInteger(history?.maxItems) ? history.maxItems : APP_CONFIG.HISTORY_LIMIT;
  const newItems = clampHistoryItems([item, ...(history?.items || [])], maxItems);

  setState('history.items', newItems);
  logger.debug('state:history:add', { format: item?.format, text: item?.text?.slice?.(0, 50) });
}

/**
 * 履歴から項目を削除
 * @param {string} id - 削除する項目のID
 */
export function removeHistoryItem(id) {
  const items = getState('history.items') || [];
  const newItems = items.filter(item => item?.id !== id);
  setState('history.items', newItems);
  logger.debug('state:history:remove', { id });
}

/**
 * 履歴をクリア
 */
export function clearHistory() {
  setState('history.items', []);
  logger.debug('state:history:clear');
}
