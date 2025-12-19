/**
 * アプリケーションの動作モード制御。
 */

import { logger } from '../core/logger.js';
import state from '../core/state/app-state.js';
import { addHistoryEntry } from '../data/history/commands.js';
import { clear as clearStorage } from '../data/storage/operations.js';
import scanner from '../scanner/controller.js';

/**
 * 初期状態を復元する。
 */
export function restoreInitialState() {
  const params = new URLSearchParams(window.location.search);

  if (params.has('debug')) {
    enableDebugMode();
  }

  if (params.has('demo')) {
    enableDemoMode();
  }

  logger.debug('初期状態復元完了');
}

/**
 * デバッグモードを有効化する。
 */
export function enableDebugMode() {
  logger.setLevel('debug');
  logger.debug('mode:debug-enabled');

  window.ScanForgeDebug = {
    getState: () => state.getState(),
    getScanner: () => scanner.getDebugInfo(),
    clearStorage: () => clearStorage(),
  };
}

/**
 * デモモードを有効化する。
 */
export function enableDemoMode() {
  logger.debug('mode:demo-enabled');
  generateDemoData();
}

function generateDemoData() {
  const demoHistory = [
    {
      text: 'https://example.com',
      format: 'qr_code',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      text: '4902220531967',
      format: 'ean_13',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      text: 'DEMO-CODE-128',
      format: 'code_128',
      timestamp: new Date(Date.now() - 10800000).toISOString(),
    },
  ];

  demoHistory.forEach(item => {
    addHistoryEntry(item);
  });

  logger.debug('mode:demo-data-generated', { count: demoHistory.length });
}
