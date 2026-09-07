/**
 * start-camera WebMCP tool adapter。
 */

import {
  CameraStartStoppedError,
  CameraInUseError,
  CameraNotFoundError,
  CameraPermissionError,
  getScannerStatus,
  isCameraActive,
  isCameraStartPending,
  startScanFromCurrentState,
  stopScan,
} from '../../scanner/controller.js';
import { navigateTo } from '../../ui/tabs/controller.js';
import { validateEmptyInput } from '../validation.js';

const FAILURE_MESSAGES = Object.freeze({
  'invalid-input': 'カメラ開始ツールは入力を受け取りません。',
  'camera-start-in-progress': 'カメラの開始処理が進行中です。完了を待ってください。',
  'camera-start-cancelled': 'カメラの開始は停止要求により取り消されました。',
  'camera-permission-required': 'カメラを開始するには、画面の案内に従ってブラウザーまたはOSのカメラ許可を有効にし、もう一度実行してください。',
  'camera-not-found': '使用可能なカメラが見つかりません。',
  'camera-in-use': 'カメラが他のアプリで使用されています。',
  'camera-start-failed': 'カメラを開始できませんでした。',
});

function failure(status) {
  return {
    ok: false,
    status,
    message: FAILURE_MESSAGES[status],
  };
}

function success(status) {
  return { ok: true, status };
}

export async function executeStartCamera(input, options = {}) {
  if (!validateEmptyInput(input)) {
    return failure('invalid-input');
  }

  const signal = options?.signal;
  signal?.throwIfAborted();
  navigateTo('scan');

  if (getScannerStatus() === 'initializing' || isCameraStartPending()) {
    return failure('camera-start-in-progress');
  }
  if (isCameraActive()) {
    return success('camera-already-active');
  }

  let startedByThisCall = false;
  try {
    await startScanFromCurrentState({ signal });
    startedByThisCall = true;
    signal?.throwIfAborted();
    return success('camera-started');
  } catch (error) {
    if (signal?.aborted) {
      if (startedByThisCall) {
        try {
          await stopScan();
        } catch {
          // 元の cancellation を保持する。stopScan 側で cleanup failure は記録済み。
        }
      }
      throw signal.reason;
    }
    if (error instanceof CameraPermissionError) {
      return failure('camera-permission-required');
    }
    if (error instanceof CameraNotFoundError) {
      return failure('camera-not-found');
    }
    if (error instanceof CameraInUseError) {
      return failure('camera-in-use');
    }
    if (error instanceof CameraStartStoppedError) {
      return failure('camera-start-cancelled');
    }
    return failure('camera-start-failed');
  }
}
