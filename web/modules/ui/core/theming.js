/**
 * テーマ適用ユーティリティ
 */

import { logger } from '../../core/logger.js';

export function applyColorScheme() {
  document.documentElement.dataset.theme = 'light';
  logger.debug('ui:theme:apply', { theme: 'light', forced: true });
}

export function setTheme(theme) {
  void theme;
  applyColorScheme();
  logger.debug('ui:theme:set', { theme: 'light', forced: true });
}

export default {
  applyColorScheme,
  setTheme,
};
