/**
 * DOM 描画を担当するモジュール。純粋なロジックは metadata / formatters に委譲する。
 */

import {
  computeBatchMetadata,
  getBatchKey,
  sortQueueForDisplay,
} from './metadata.js';
import { formatBatchTime } from './formatters.js';
import { buildEmptyMessage } from './render-empty.js';
import { buildBatchHeader } from './render-batch.js';
import { buildJobElement } from './render-job.js';

export function renderQueue(queue, options) {
  const {
    container,
    formats,
    formatDateTime,
    logger,
    document = window.document,
  } = options;

  if (!container) {
    return;
  }

  container.textContent = '';

  if (!Array.isArray(queue) || queue.length === 0) {
    container.appendChild(buildEmptyMessage(document));
    return;
  }

  const orderedQueue = sortQueueForDisplay(queue);
  const batchMetadata = computeBatchMetadata(
    orderedQueue,
    (timestamp) => formatBatchTime(timestamp, formatDateTime, logger),
  );

  const fragment = document.createDocumentFragment();
  let lastBatchKey = null;
  let batchIndex = -1;

  orderedQueue.forEach(job => {
    const batchKey = getBatchKey(job);
    if (batchKey !== lastBatchKey) {
      batchIndex += 1;
      const meta = batchMetadata.get(batchKey) || null;
      fragment.appendChild(buildBatchHeader(meta, batchIndex, document));
      lastBatchKey = batchKey;
    }
    fragment.appendChild(buildJobElement(job, {
      batchIndex,
      formats,
      document,
    }));
  });

  container.appendChild(fragment);
}
