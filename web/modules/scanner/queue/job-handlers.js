/**
 * 画像ジョブの状態更新と副作用（履歴追加・トースト通知）を担当する。
 */

import { logger } from '../../core/logger.js';
import { setState } from '../../core/state/base.js';
import {
  addImageActiveTask,
  removeImageActiveTask,
  updateImageQueueJob,
} from '../../core/state/scanner/image-queue/mutations.js';
import { addHistoryEntry } from '../../data/history/commands.js';
import toast from '../../ui/toast/manager.js';
import { scheduleAutoRetry, clearAutoRetryTimer } from './auto-retry.js';
import {
  isRetryableImageError,
  toFriendlyImageError,
} from './utils.js';
import { getImageJobStore } from '../context.js';

export function handleImageJobSuccess(context, payload, durationMs) {
  const { engine, results, width, height } = payload;
  const detections = Array.isArray(results) ? results : [];

  const store = getImageJobStore();

  detections.forEach(detection => {
    const detectionWithMeta = {
      ...detection,
      engine,
      source: 'image',
    };
    const metadata = {
      engine: detectionWithMeta.engine,
      source: detectionWithMeta.source,
      boundingBox: detectionWithMeta.boundingBox,
      timestamp: detectionWithMeta.timestamp ?? Date.now(),
      batchId: context.batchId,
      batchCreatedAt: context.batchCreatedAt,
      fileName: context.file?.name || '',
      fileSize: context.file?.size || 0,
      jobId: context.id,
    };
    addHistoryEntry({
      text: detectionWithMeta.text,
      format: detectionWithMeta.format,
      metadata,
    });
    toast.notifyDetection(detectionWithMeta);
  });

  if (detections.length) {
    const latest = {
      ...detections[0],
      engine,
      source: 'image',
      metadata: {
        engine,
        source: 'image',
        boundingBox: detections[0]?.boundingBox,
        timestamp: detections[0]?.timestamp ?? Date.now(),
        batchId: context.batchId,
        batchCreatedAt: context.batchCreatedAt,
        fileName: context.file?.name || '',
        fileSize: context.file?.size || 0,
        jobId: context.id,
      },
    };
    setState('scanner.lastDetection', latest);
  }

  updateImageQueueJob(context.id, {
    status: 'success',
    progress: { mode: 'determinate', value: 1 },
    error: null,
    result: {
      engine,
      results: detections,
      width,
      height,
      completedAt: Date.now(),
    },
    durationMs: durationMs || 0,
  });

  logger.debug('scanner:image-analysis:complete', {
    jobId: context.id,
    engine,
    count: detections.length,
    fileName: context.file?.name,
  });

  store.set(context.id, context);
}

export function handleImageJobNoResult(context, durationMs) {
  context.autoRetryCount = 0;
  const message = 'コードを検出できませんでした。別の画像でお試しください。';
  updateImageQueueJob(context.id, {
    status: 'failed',
    progress: null,
    error: message,
    attempts: context.attempts,
    durationMs: durationMs || 0,
  });
  toast.info(message);
}

export function handleImageJobCanceled(context) {
  clearAutoRetryTimer(context);
  updateImageQueueJob(context.id, {
    status: 'canceled',
    progress: null,
    error: '処理をキャンセルしました。',
    retryAt: null,
  });
}

export function handleImageJobFailure(context, error, durationMs) {
  const message = toFriendlyImageError(error);
  logger.error('画像解析エラー', error);

  if (isRetryableImageError(error) && scheduleAutoRetry(context, message, durationMs)) {
    return;
  }

  context.autoRetryCount = 0;
  updateImageQueueJob(context.id, {
    status: 'failed',
    progress: null,
    error: message,
    attempts: context.attempts,
    retryAt: null,
    durationMs: durationMs || 0,
  });
  toast.error(message);
}

export function registerActiveTask(id) {
  addImageActiveTask(id);
}

export function unregisterActiveTask(id) {
  removeImageActiveTask(id);
}
