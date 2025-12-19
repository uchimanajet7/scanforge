/**
 * UI領域サブストア
 *
 * UI とプレビューに関する状態と操作を提供する。
 */

import { APP_CONFIG } from '../config/app-settings.js';
import { getState, setState } from './base.js';

/**
 * UI状態の初期値を生成
 * @returns {Object} 初期UI状態
 */
export function createDefaultUiState() {
  return {
    currentRoute: 'scan',
    toasts: [],
    isLoading: false,
  };
}

/**
 * プレビュー状態の初期値を生成
 * @returns {Object} 初期プレビュー状態
 */
export function createDefaultPreviewState() {
  return {
    displayScale: 1,
    actualSize: { width: 0, height: 0 },
    intrinsicSize: { width: 0, height: 0 },
  };
}

/**
 * トーストを追加
 * @param {Object} toast - トースト情報
 * @returns {string} 追加されたトーストID
 */
export function addToast(toast) {
  const toasts = getState('ui.toasts') || [];
  const newToast = {
    id: toast?.id ?? Date.now().toString(),
    ...toast,
  };

  setState('ui.toasts', [...toasts, newToast]);

  if (toast?.duration !== 0) {
    setTimeout(() => {
      removeToast(newToast.id);
    }, toast?.duration || APP_CONFIG.TOAST_DEFAULT_DURATION);
  }

  return newToast.id;
}

/**
 * トーストを削除
 * @param {string} id - 削除するトーストID
 */
export function removeToast(id) {
  const toasts = getState('ui.toasts') || [];
  setState('ui.toasts', toasts.filter(toast => toast?.id !== id));
}
