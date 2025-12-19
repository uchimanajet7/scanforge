/**
 * ZXing ライブラリの動的ロード。
 */

import { logger } from '../../../core/logger.js';
import {
  getIsLibraryLoaded,
  setIsLibraryLoaded,
} from './state.js';

export async function loadLibrary() {
  if (getIsLibraryLoaded()) {
    return;
  }

  logger.debug('zxing:library-load:start');

  try {
    await loadScript('https://unpkg.com/@zxing/library@latest/umd/index.min.js');

    if (!window.ZXing) {
      throw new Error('ZXing ライブラリのロードに失敗しました');
    }

    setIsLibraryLoaded(true);
    logger.debug('zxing:library-load:complete');
  } catch (error) {
    logger.error('ZXing ライブラリロードエラー', error);
    throw error;
  }
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`スクリプトのロードに失敗: ${src}`));
    document.head.appendChild(script);
  });
}
