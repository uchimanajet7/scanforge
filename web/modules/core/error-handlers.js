/**
 * ScanForge - グローバルエラーハンドラ
 */

import { logger } from './logger.js';

export function setupErrorHandlers() {
  window.addEventListener('error', (event) => {
    logger.error('未処理エラー', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    logger.error('未処理の Promise rejection', {
      reason: event.reason,
      promise: event.promise,
    });
  });
}
