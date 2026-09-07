/**
 * read-scanforge-export WebMCP tool adapter。
 */

import { readScanForgeExport } from '../export-transfer.js';
import { validateReadExportInput } from '../validation.js';

const FAILURE_MESSAGES = Object.freeze({
  'invalid-input': '成果物の読取りに指定した入力が契約に一致しません。',
  'transfer-unavailable': '指定した成果物は無効、置換済み、または解放済みです。',
  'invalid-range': '成果物の読取り範囲がファイルの範囲外です。',
  'export-read-failed': '成果物のバイト列を読み取れませんでした。',
});

function failure(status) {
  return { ok: false, status, message: FAILURE_MESSAGES[status] };
}

export async function executeReadScanForgeExport(input, options = {}) {
  const validated = validateReadExportInput(input);
  if (!validated.valid) {
    return failure('invalid-input');
  }

  const signal = options?.signal;
  signal?.throwIfAborted();
  try {
    return await readScanForgeExport(validated, signal);
  } catch (error) {
    if (signal?.aborted) {
      throw signal.reason;
    }
    if (error?.code === 'transfer-unavailable' || error?.code === 'invalid-range') {
      return failure(error.code);
    }
    return failure('export-read-failed');
  }
}
