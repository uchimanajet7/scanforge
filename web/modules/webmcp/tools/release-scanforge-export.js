/**
 * release-scanforge-export WebMCP tool adapter。
 */

import { releaseScanForgeExport } from '../export-transfer.js';
import { validateReleaseExportInput } from '../validation.js';

const INVALID_INPUT = Object.freeze({
  ok: false,
  status: 'invalid-input',
  message: '成果物の解放に指定した入力が契約に一致しません。',
});

export function executeReleaseScanForgeExport(input, options = {}) {
  const validated = validateReleaseExportInput(input);
  if (!validated.valid) {
    return { ...INVALID_INPUT };
  }

  const signal = options?.signal;
  signal?.throwIfAborted();
  const released = releaseScanForgeExport(validated.transferId);
  signal?.throwIfAborted();
  return {
    ok: true,
    status: released ? 'export-released' : 'export-not-found',
    transferId: validated.transferId,
    released,
  };
}
