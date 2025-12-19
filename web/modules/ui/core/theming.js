/**
 * テーマ適用ユーティリティ
 */

import { logger } from '../../core/logger.js';
import { getState } from '../../core/state/base.js';
import { updateSettings } from '../../core/state/settings.js';

export function applyColorScheme() {
  const theme = getState('settings.theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (theme === 'auto' || !theme) {
    document.documentElement.dataset.theme = 'auto';
  } else {
    document.documentElement.dataset.theme = theme;
  }

  logger.debug('ui:theme:apply', { theme, prefersDark });
}

export function setTheme(theme) {
  updateSettings({ theme });
  applyColorScheme();
  logger.debug('ui:theme:set', { theme });
}

export default {
  applyColorScheme,
  setTheme,
};
