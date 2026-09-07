/**
 * request-generated-code-download WebMCP tool adapter。
 */

import {
  createBrowserDownloadResult,
  prepareScanForgeExport,
  releaseScanForgeExport,
  requestPreparedScanForgeExportDownload,
} from '../export-transfer.js';
import { validateGeneratedDownloadInput } from '../validation.js';

const FAILURE_MESSAGES = Object.freeze({
  'invalid-input': '生成結果のダウンロード入力は任意のgenerationIdだけを受け取ります。',
  'preview-unavailable': '先に generate-code を実行するか、画面からコードを生成してください。',
  'generation-mismatch': '指定したgenerationIdは現在の生成結果と一致しません。',
  'download-failed': '生成結果のダウンロード処理をブラウザーへ渡せませんでした。',
});

function failure(status) {
  return {
    ok: false,
    status,
    message: FAILURE_MESSAGES[status],
  };
}

export async function executeRequestGeneratedCodeDownload(input, options = {}) {
  const validated = validateGeneratedDownloadInput(input);
  if (!validated.valid) {
    return failure('invalid-input');
  }

  const signal = options?.signal;
  signal?.throwIfAborted();

  let prepared = null;
  try {
    prepared = await prepareScanForgeExport({
      kind: 'generated-code',
      generationId: validated.generationId,
    }, signal);
    signal?.throwIfAborted();
    try {
      requestPreparedScanForgeExportDownload(prepared.transferId, { signal });
      return createBrowserDownloadResult(prepared, {
        requestDispatched: true,
        manualControlLabel: '結果をダウンロード',
      });
    } catch (error) {
      if (signal?.aborted) {
        releaseScanForgeExport(prepared.transferId);
        throw signal.reason;
      }
      return createBrowserDownloadResult(prepared, {
        requestDispatched: false,
        manualControlLabel: '結果をダウンロード',
      });
    }
  } catch (error) {
    if (signal?.aborted) {
      if (prepared?.transferId) {
        releaseScanForgeExport(prepared.transferId);
      }
      throw signal.reason;
    }
    if (error?.code === 'preview-unavailable' || error?.code === 'generation-mismatch') {
      return failure(error.code);
    }
    return failure('download-failed');
  }
}
