/**
 * 画像ジョブの実行ループを担当し、scanFile を呼び出す。
 */

import { updateImageQueueJob } from '../../core/state/scanner/image-queue/mutations.js';
import * as imageScanner from '../image/pipeline.js';
import {
  handleImageJobSuccess,
  handleImageJobNoResult,
  handleImageJobCanceled,
  handleImageJobFailure,
} from './job-handlers.js';
import { finalizeImageJob } from './scheduler.js';

export async function runImageJob(context) {
  const { id } = context;

  try {
    updateImageQueueJob(id, {
      status: 'scanning',
      progress: { mode: 'indeterminate', value: null },
    });

    const result = await imageScanner.scanFile(context.file, {
      signal: context.controller.signal,
    });

    if (context.canceled || context.controller?.signal.aborted) {
      handleImageJobCanceled(context);
      return;
    }

    const durationMs = performance.now() - context.startedAt;

    if (!Array.isArray(result?.results) || result.results.length === 0) {
      handleImageJobNoResult(context, durationMs);
      return;
    }

    handleImageJobSuccess(context, result, durationMs);
  } catch (error) {
    const durationMs = performance.now() - context.startedAt;
    if (context.canceled || (error instanceof imageScanner.ImageScanError && error.code === 'canceled')) {
      handleImageJobCanceled(context);
    } else {
      handleImageJobFailure(context, error, durationMs);
    }
  } finally {
    finalizeImageJob(context);
  }
}
