/**
 * データモジュールの初期化処理。
 */

import { logger } from '../core/logger.js';
import { initHistory } from './history/init.js';
import formats from './formats/catalog.js';
import { initStorage } from './storage/init.js';

export async function initData() {
  logger.debug('data:init:start');

  try {
    initStorage();
    formats.init();
    initHistory();
    logger.debug('data:init:complete');
  } catch (error) {
    logger.error('データ管理初期化エラー', error);
    throw error;
  }
}
