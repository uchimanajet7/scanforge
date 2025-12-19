/**
 * アプリケーション初期化のエントリーポイント。
 */

import { initCore } from '../core/app-core.js';
import { setupErrorHandlers } from '../core/error-handlers.js';
import { logger } from '../core/logger.js';
import { BUILD_INFO } from '../core/build-info.js';
import { initUI } from '../ui/app-ui.js';
import { initData } from '../data/lifecycle.js';
import { initScanner } from '../scanner/controller.js';
import { setupInitialScreen } from './setup.js';

/**
 * アプリケーションを初期化する。
 */
export async function initApp() {
  const startTime = performance.now();

  logger.debug('initApp開始');

  try {
    applyCacheBust();
    logger.debug('キャッシュバスティング完了');

    logger.info('startup:begin');

    setupErrorHandlers();

    logger.debug('initCore開始');
    await initCore();
    logger.debug('initCore完了');

    logger.debug('initData開始');
    await initData();
    logger.debug('initData完了');

    logger.debug('initUI開始');
    await initUI();
    logger.debug('initUI完了');

    logger.debug('initScanner開始');
    await initScanner();
    logger.debug('initScanner完了');

    logger.debug('setupInitialScreen開始');
    await setupInitialScreen();
    logger.debug('setupInitialScreen完了');

    const endTime = performance.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    logger.info('startup:complete', { durationSeconds: Number(duration) });
    notifyInitComplete();
  } catch (error) {
    logger.error('アプリケーション初期化エラー', {
      message: error?.message,
      stack: error?.stack,
      error,
    });
    showInitError(error);
  }
}

function applyCacheBust() {
  const version = BUILD_INFO.version || Date.now().toString();

  const links = document.querySelectorAll('link[data-cache-bust="stylesheet"]');
  links.forEach(link => {
    const href = link.getAttribute('href');
    if (href && !href.includes('?v=')) {
      link.setAttribute('href', `${href}?v=${version}`);
    }
  });

  const scripts = document.querySelectorAll('script[data-cache-bust="script"]');
  scripts.forEach(script => {
    const src = script.getAttribute('src');
    if (src && !src.includes('?v=')) {
      script.setAttribute('src', `${src}?v=${version}`);
    }
  });
}

function notifyInitComplete() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const loader = document.getElementById('appLoading');
      if (loader) {
        loader.setAttribute('hidden', 'true');
      }

      document.documentElement.classList.remove('is-loading');

      const event = new CustomEvent('scanforge:ready', {
        detail: {
          version: BUILD_INFO.version,
          timestamp: Date.now(),
        },
      });

      window.dispatchEvent(event);

      logger.info('app:ready', {
        version: BUILD_INFO.version,
        timestamp: Date.now(),
      });
    });
  });
}

function showInitError(error) {
  logger.error('初期化エラー', {
    message: error?.message,
    stack: error?.stack,
    error,
  });

  const errorContainer = document.getElementById('appError');
  if (errorContainer) {
    errorContainer.innerHTML = `
      <div class="error-content">
        <h2>⚠️ 初期化エラー</h2>
        <p>アプリケーションの起動に失敗しました。</p>
        <details>
          <summary>エラー詳細</summary>
          <pre>${error.stack || error.message}</pre>
        </details>
        <button onclick="location.reload()">再読み込み</button>
      </div>
    `;
    errorContainer.style.display = 'block';
  }

  const loader = document.getElementById('appLoading');
  if (loader) {
    loader.setAttribute('hidden', 'true');
  }

  document.documentElement.classList.remove('is-loading');
}
