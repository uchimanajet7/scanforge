/**
 * stop-camera WebMCP tool adapter。
 */

import {
  isCameraActive,
  isCameraStartPending,
  stopScan,
} from '../../scanner/controller.js';
import { validateEmptyInput } from '../validation.js';

const FAILURE_MESSAGES = Object.freeze({
  'invalid-input': 'カメラ停止ツールは入力を受け取りません。',
  'camera-stop-failed': 'カメラとライブ検出を停止できませんでした。',
});

function failure(status) {
  return { ok: false, status, message: FAILURE_MESSAGES[status] };
}

export async function executeStopCamera(input, options = {}) {
  if (!validateEmptyInput(input)) {
    return failure('invalid-input');
  }

  const signal = options?.signal;
  signal?.throwIfAborted();

  if (!isCameraActive() && !isCameraStartPending()) {
    return { ok: true, status: 'camera-already-stopped' };
  }

  try {
    await stopScan();
    signal?.throwIfAborted();
    return { ok: true, status: 'camera-stopped' };
  } catch (error) {
    if (signal?.aborted) {
      throw signal.reason;
    }
    return failure('camera-stop-failed');
  }
}
