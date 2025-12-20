/**
 * 永続化サブストア
 *
 * `localStorage` との同期処理（復元・保存・自動保存）を管理する。
 */

import { logger } from '../logger.js';
import { APP_CONFIG } from '../config/app-settings.js';
import { STORAGE_KEYS } from '../config/storage-keys.js';
import { getState, setState, updateState, subscribe } from './base.js';

const SETTINGS_STORAGE_KEY = STORAGE_KEYS.settings;
const HISTORY_STORAGE_KEY = STORAGE_KEYS.history;
const MIRROR_STORAGE_KEY = STORAGE_KEYS.mirror;
const AUTO_PERSIST_DEBOUNCE_MS = 1000;

let autoPersistActive = false;

/**
 * 指定関数をデバウンスする
 * @param {Function} func - 対象関数
 * @param {number} wait - 待機時間
 * @returns {Function} デバウンス関数
 */
function debounce(func, wait) {
  let timeout;
  return function debounced(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * `localStorage` から状態を復元
 */
export function restoreState() {
  try {
    const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        updateState('settings', parsed);
        logger.debug('state:restore:settings', parsed);
      } else {
        logger.warn('state:restore:settings:invalid', { type: typeof parsed });
      }
    }

    const savedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (savedHistory) {
      const items = JSON.parse(savedHistory);
      setState('history.items', Array.isArray(items) ? items : []);
      logger.debug('state:restore:history', { count: Array.isArray(items) ? items.length : 0 });
    }

    const savedMirror = localStorage.getItem(MIRROR_STORAGE_KEY);
    if (savedMirror != null) {
      try {
        const parsed = JSON.parse(savedMirror);
        setState('scanner.isMirrored', !!parsed);
        logger.debug('state:restore:mirror', { enabled: !!parsed });
      } catch (error) {
        logger.warn('鏡像設定復元失敗', { error });
        setState('scanner.isMirrored', APP_CONFIG.MIRROR_DEFAULT);
      }
    } else {
      setState('scanner.isMirrored', APP_CONFIG.MIRROR_DEFAULT);
    }
  } catch (error) {
    logger.error('状態復元エラー', error);
  }
}

/**
 * 現在の状態を `localStorage` に保存
 */
export function persistState() {
  try {
    const settings = getState('settings');
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));

    const items = getState('history.items') || [];
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(items));

    const mirror = getState('scanner.isMirrored');
    localStorage.setItem(MIRROR_STORAGE_KEY, JSON.stringify(!!mirror));

    logger.debug('状態保存完了');
  } catch (error) {
    logger.error('状態保存エラー', error);
  }
}

/**
 * 自動保存を開始
 */
export function startAutoPersist() {
  if (autoPersistActive) {
    logger.debug('state:auto-persist:skip');
    return;
  }

  const debouncedPersist = debounce(persistState, AUTO_PERSIST_DEBOUNCE_MS);
  subscribe('settings.*', debouncedPersist);
  subscribe('settings', debouncedPersist);
  subscribe('history.*', debouncedPersist);
  subscribe('scanner.isMirrored', debouncedPersist);

  autoPersistActive = true;
  logger.debug('state:auto-persist:start');
}
