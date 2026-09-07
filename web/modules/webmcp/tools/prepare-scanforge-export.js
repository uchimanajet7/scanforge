/**
 * prepare-scanforge-export WebMCP tool adapter。
 */

import {
  prepareScanForgeExport,
  releaseScanForgeExport,
} from '../export-transfer.js';
import { validatePrepareExportInput } from '../validation.js';

const FAILURE_MESSAGES = Object.freeze({
  'invalid-input': '成果物の受け渡し準備に指定した入力が契約に一致しません。',
  'preview-unavailable': '先に generate-code を実行するか、画面からコードを生成してください。',
  'generation-mismatch': '指定したgenerationIdは現在の生成結果と一致しません。',
  'export-prepare-failed': '成果物の受け渡しを準備できませんでした。',
});

function failure(status) {
  return { ok: false, status, message: FAILURE_MESSAGES[status] };
}

export async function executePrepareScanForgeExport(input, options = {}) {
  const validated = validatePrepareExportInput(input);
  if (!validated.valid) {
    return failure('invalid-input');
  }

  const signal = options?.signal;
  signal?.throwIfAborted();
  let prepared = null;
  try {
    prepared = await prepareScanForgeExport({
      kind: validated.kind,
      generationId: validated.generationId,
    }, signal);
    signal?.throwIfAborted();
    return prepared;
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
    return failure('export-prepare-failed');
  }
}
