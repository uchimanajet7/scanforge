/**
 * scan-current-frame WebMCP tool adapter。
 */

import { isCameraActive, scanCurrentFrame } from '../../scanner/controller.js';
import { navigateTo } from '../../ui/tabs/controller.js';
import { truncateText, validateEmptyInput } from '../validation.js';

const MAX_DETECTIONS = 20;
const FAILURE_MESSAGES = Object.freeze({
  'invalid-input': '現在フレームのスキャンは入力を受け取りません。',
  'camera-inactive': '先に start-camera を実行するか、画面からカメラを開始してください。',
  'scan-failed': '現在のカメラ映像をスキャンできませんでした。',
});

function failure(status) {
  return {
    ok: false,
    status,
    message: FAILURE_MESSAGES[status],
  };
}

function projectDetection(detection) {
  const projectedText = truncateText(detection?.text);
  return {
    format: typeof detection?.format === 'string' ? detection.format : 'unknown',
    text: projectedText.text,
    textTruncated: projectedText.textTruncated,
  };
}

export async function executeScanCurrentFrame(input, options = {}) {
  if (!validateEmptyInput(input)) {
    return failure('invalid-input');
  }

  const signal = options?.signal;
  signal?.throwIfAborted();

  try {
    navigateTo('scan');
    if (!isCameraActive()) {
      return failure('camera-inactive');
    }

    const accepted = await scanCurrentFrame({ signal });
    signal?.throwIfAborted();
    if (!Array.isArray(accepted)) {
      return failure('scan-failed');
    }

    const totalDetected = accepted.length;
    const detections = accepted.slice(0, MAX_DETECTIONS).map(projectDetection);
    return {
      ok: true,
      status: totalDetected === 0 ? 'no-detection' : 'scanned',
      returned: detections.length,
      totalDetected,
      truncated: totalDetected > MAX_DETECTIONS,
      detections,
    };
  } catch (error) {
    if (signal?.aborted) {
      throw signal.reason;
    }
    return failure('scan-failed');
  }
}
