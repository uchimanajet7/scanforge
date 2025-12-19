/**
 * 状態管理基盤モジュール
 *
 * アプリケーション全体の状態オブジェクトとパスベースの
 * 読み書き/リスナー仕組みを提供する。
 */

import { logger } from '../logger.js';

const listeners = new Map();
let appState = {};

/**
 * 状態ルートを初期化
 * @param {object} initialState - ルート状態
 */
export function initializeAppState(initialState) {
  if (!initialState || typeof initialState !== 'object') {
    throw new Error('initializeAppState: 初期状態が不正です');
  }
  appState = initialState;
}

/**
 * ルート状態を取得
 * @returns {object} ルート状態
 */
export function getAppState() {
  return appState;
}

/**
 * 状態変更リスナーを登録
 * @param {string} path - 監視パス
 * @param {Function} callback - 変更時のコールバック
 * @returns {Function} アンサブスクライブ関数
 */
export function subscribe(path, callback) {
  if (!listeners.has(path)) {
    listeners.set(path, new Set());
  }

  listeners.get(path).add(callback);
  logger.debug(`状態リスナー登録: ${path}`);

  return () => {
    const pathListeners = listeners.get(path);
    if (pathListeners) {
      pathListeners.delete(callback);
      if (pathListeners.size === 0) {
        listeners.delete(path);
      }
    }
    logger.debug(`状態リスナー解除: ${path}`);
  };
}

function notifyListeners(path, value, oldValue) {
  const exactListeners = listeners.get(path);
  if (exactListeners) {
    exactListeners.forEach(callback => {
      try {
        callback(value, oldValue, path);
      } catch (error) {
        logger.error('状態リスナーエラー', { path, error });
      }
    });
  }

  const parts = path.split('.');
  for (let i = parts.length - 1; i > 0; i -= 1) {
    const parentPath = `${parts.slice(0, i).join('.')}.*`;
    const parentListeners = listeners.get(parentPath);
    if (parentListeners) {
      parentListeners.forEach(callback => {
        try {
          callback(value, oldValue, path);
        } catch (error) {
          logger.error('状態リスナーエラー', { path: parentPath, error });
        }
      });
    }
  }
}

/**
 * 状態を取得
 * @param {string} path - 取得パス
 * @returns {*} 現在の値
 */
export function getState(path) {
  if (!path) return appState;

  const parts = path.split('.');
  let current = appState;

  for (const part of parts) {
    if (current == null || typeof current !== 'object') {
      return undefined;
    }
    current = current[part];
  }

  return current;
}

/**
 * 状態を設定
 * @param {string} path - 設定パス
 * @param {*} value - 設定値
 */
export function setState(path, value) {
  const parts = path.split('.');
  const lastPart = parts.pop();

  let current = appState;
  for (const part of parts) {
    if (current[part] == null || typeof current[part] !== 'object') {
      current[part] = {};
    }
    current = current[part];
  }

  const oldValue = current[lastPart];
  if (oldValue === value) {
    return;
  }

  current[lastPart] = value;
  logger.debug(`状態更新: ${path}`, { oldValue, newValue: value });
  notifyListeners(path, value, oldValue);
}

/**
 * オブジェクト状態を部分更新
 * @param {string} path - 更新パス
 * @param {object} updates - 更新内容
 */
export function updateState(path, updates) {
  const current = getState(path);

  if (typeof current !== 'object' || current == null) {
    logger.warn(`状態更新失敗: ${path} はオブジェクトではありません`);
    return;
  }

  const merged = { ...current, ...updates };
  setState(path, merged);
}
