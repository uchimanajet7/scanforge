/**
 * アプリケーション初期画面の構成処理。
 */

import { logger } from '../core/logger.js';
import { initGenerator } from '../generator/initializer.js';
import { configureImportUI } from '../ui/app-ui.js';
import scanner from '../scanner/controller.js';
import { restoreInitialState } from './modes.js';
import { registerGlobalEventHandlers } from './events.js';
import toast from '../ui/toast/manager.js';

/**
 * 初期画面のセットアップを実施する。
 */
export async function setupInitialScreen() {
  configureDomElements();
  registerGlobalEventHandlers();
  configureScanImportInterface();
  await initGenerator();
  restoreInitialState();
  logger.debug('setup:initial-screen:complete');
}

/**
 * 必須DOM要素を検証する。
 */
function configureDomElements() {
  const requiredElements = [
    '#scanVideo',
    '#scanOverlay',
    '#scanStatus',
    '#generateForm',
    '#previewContainer',
    '#previewViewport',
  ];

  const missingElements = [];

  requiredElements.forEach(selector => {
    if (!document.querySelector(selector)) {
      missingElements.push(selector);
    }
  });

  if (missingElements.length > 0) {
    logger.warn('必須DOM要素が見つかりません', { missing: missingElements });
  }
}

/**
 * 画像読み込みUIを初期化する。
 */
function configureScanImportInterface() {
  configureImportUI({
    onSelectFiles: async (files) => {
      try {
        await scanner.enqueueImageFiles(files);
      } catch (error) {
        logger.error('画像ファイルのキュー投入でエラーが発生しました', error);
      }
    },
    onCancelJob: (jobId) => {
      scanner.cancelImageJob(jobId);
    },
    onRetryJob: (jobId) => {
      scanner.retryImageJob(jobId, { manual: true });
    },
    onRemoveJob: (jobId) => {
      scanner.removeImageJob(jobId);
    },
    onRetryFailed: () => {
      const count = scanner.retryFailedImageJobs();
      toast.info(count ? `${count} 件の失敗を再実行しました。` : '再実行できる失敗はありません。');
    },
    onAbortActive: () => {
      const count = scanner.stopImageProcessing();
      toast.info(count ? `${count} 件の処理を中止しました。` : '中止できる処理はありません。');
    },
    onReset: () => {
      const clearedJobs = scanner.resetImageQueue();
      toast.info(clearedJobs ? `${clearedJobs} 件の処理をすべてクリアしました。` : 'クリアできる処理はありません。');
    },
  });
}
