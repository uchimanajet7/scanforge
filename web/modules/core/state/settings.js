/**
 * 設定領域サブストア
 *
 * アプリ設定の初期状態と更新ロジックを管理し、
 * 永続化モジュールや UI からの更新要求に応える。
 */

import { logger } from '../logger.js';
import { DEFAULT_SETTINGS } from '../config/app-settings.js';
import { updateState } from './base.js';

/**
 * 設定の初期状態を生成
 * @returns {Object} 初期設定
 */
export function createDefaultSettingsState() {
  return {
    ...DEFAULT_SETTINGS,
    scanFormatsManual: [...DEFAULT_SETTINGS.scanFormatsManual],
  };
}

/**
 * 設定を更新
 * @param {Object} updates - 更新内容
 */
export function updateSettings(updates) {
  updateState('settings', updates);
  logger.debug('state:settings:update', updates);
}
