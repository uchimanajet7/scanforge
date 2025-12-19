/**
 * ScanForge - コア初期化
 */

import { logger } from './logger.js';
import { BUILD_INFO, publishBuildInfo, applyStylesheetCacheBust } from './build-info.js';
import { OBSOLETE_KEYS } from './config/storage-keys.js';
import { restoreState, startAutoPersist } from './state/persistence.js';

export async function initCore() {
  logger.info('init:start');

  try {
    publishBuildInfo(BUILD_INFO, logger);
    logger.info('init:build-info', BUILD_INFO);

    applyStylesheetCacheBust();

    restoreState();
    startAutoPersist();

    cleanupObsoleteStorage();

    logger.info('init:complete');
  } catch (error) {
    logger.error('初期化エラー', error);
    throw error;
  }
}

function cleanupObsoleteStorage() {
  Object.values(OBSOLETE_KEYS).forEach(key => {
    try {
      if (localStorage.getItem(key) !== null) {
        localStorage.removeItem(key);
        logger.debug(`旧キー削除: ${key}`);
      }
    } catch (error) {
      logger.warn(`旧キー削除失敗: ${key}`, error);
    }
  });
}

export { BUILD_INFO };
