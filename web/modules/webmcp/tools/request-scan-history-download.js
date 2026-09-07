/**
 * request-scan-history-download WebMCP tool adapter。
 */

import {
  createBrowserDownloadResult,
  prepareScanForgeExport,
  releaseScanForgeExport,
  requestPreparedScanForgeExportDownload,
} from '../export-transfer.js';
import { validateEmptyInput } from '../validation.js';

const FAILURE_MESSAGES = Object.freeze({
  'invalid-input': 'スキャン履歴のダウンロードは入力を受け取りません。',
  'history-download-failed': 'スキャン履歴のダウンロード処理をブラウザーへ渡せませんでした。',
});

function failure(status) {
  return {
    ok: false,
    status,
    message: FAILURE_MESSAGES[status],
  };
}

export async function executeRequestScanHistoryDownload(input, options = {}) {
  if (!validateEmptyInput(input)) {
    return failure('invalid-input');
  }

  const signal = options?.signal;
  signal?.throwIfAborted();

  let prepared = null;
  try {
    prepared = await prepareScanForgeExport({ kind: 'scan-history' }, signal);
    signal?.throwIfAborted();
    try {
      requestPreparedScanForgeExportDownload(prepared.transferId, { signal });
      return createBrowserDownloadResult(prepared, {
        requestDispatched: true,
        manualControlLabel: '履歴を書き出す',
      });
    } catch (error) {
      if (signal?.aborted) {
        releaseScanForgeExport(prepared.transferId);
        throw signal.reason;
      }
      return createBrowserDownloadResult(prepared, {
        requestDispatched: false,
        manualControlLabel: '履歴を書き出す',
      });
    }
  } catch {
    if (signal?.aborted) {
      if (prepared?.transferId) {
        releaseScanForgeExport(prepared.transferId);
      }
      throw signal.reason;
    }
    return failure('history-download-failed');
  }
}
