/**
 * カメラのストリーム制御を行う。起動、停止、一時停止を扱う。
 */

import { logger } from '../../core/logger.js';
import { setState } from '../../core/state/base.js';
import { APP_CONFIG } from '../../core/config/app-settings.js';
import {
  getMediaStream,
  setMediaStream,
  clearMediaStream,
  getVideoElement as getVideoElementState,
  setVideoElement as setVideoElementState,
  clearVideoElement,
  getCurrentDeviceId as getCurrentDeviceIdState,
  setCurrentDeviceId as setCurrentDeviceIdState,
  getDeviceList as getDeviceListState,
} from './state.js';
import {
  CameraPermissionError,
  CameraNotFoundError,
  CameraInUseError,
} from './errors.js';

const CAMERA_PERMISSION_STATES = new Set(['granted', 'prompt', 'denied']);

function getAbortReason(signal) {
  if (signal?.reason !== undefined) {
    return signal.reason;
  }
  const error = new Error('The operation was aborted');
  error.name = 'AbortError';
  return error;
}

function stopStreamTracks(stream) {
  stream?.getTracks?.().forEach(track => track.stop());
}

function clearPendingVideo(stream = null) {
  const videoElement = getVideoElementState();
  if (videoElement && (!stream || videoElement.srcObject === stream)) {
    videoElement.srcObject = null;
  }
  clearVideoElement();
  setCurrentDeviceIdState(null);
  setState('scanner.stream', null);
}

async function getUserMediaWithSignal(constraints, signal) {
  signal?.throwIfAborted();
  const mediaPromise = navigator.mediaDevices.getUserMedia(constraints);
  if (!signal) {
    return mediaPromise;
  }

  let abortHandler = null;
  const abortPromise = new Promise((_, reject) => {
    abortHandler = () => reject(getAbortReason(signal));
    if (signal.aborted) {
      abortHandler();
      return;
    }
    signal.addEventListener('abort', abortHandler, { once: true });
  });

  try {
    const stream = await Promise.race([mediaPromise, abortPromise]);
    signal.throwIfAborted();
    return stream;
  } catch (error) {
    if (signal.aborted) {
      mediaPromise.then(stopStreamTracks).catch(() => {});
      throw getAbortReason(signal);
    }
    throw error;
  } finally {
    if (abortHandler) {
      signal.removeEventListener('abort', abortHandler);
    }
  }
}

export async function getPermissionState() {
  if (typeof navigator === 'undefined' || typeof navigator.permissions?.query !== 'function') {
    return 'unknown';
  }

  try {
    const permission = await navigator.permissions.query({ name: 'camera' });
    return CAMERA_PERMISSION_STATES.has(permission?.state) ? permission.state : 'unknown';
  } catch {
    return 'unknown';
  }
}

export async function start(video, options = {}) {
  const {
    deviceId = null,
    facingMode = 'environment',
    width = APP_CONFIG.VIDEO_IDEAL_WIDTH,
    height = APP_CONFIG.VIDEO_IDEAL_HEIGHT,
    signal,
  } = options;

  logger.debug('camera:start', { deviceId, facingMode });
  let acquiredStream = null;

  try {
    signal?.throwIfAborted();

    if (!video) {
      throw new CameraNotFoundError('カメラ表示用のビデオ要素が見つかりません');
    }

    if (getMediaStream()) {
      await stop();
      signal?.throwIfAborted();
    }

    setVideoElementState(video);

    const constraints = {
      audio: false,
      video: {
        width: { ideal: width },
        height: { ideal: height },
      },
    };

    if (deviceId) {
      constraints.video.deviceId = { exact: deviceId };
    } else if (facingMode) {
      constraints.video.facingMode = { ideal: facingMode };
    }

    acquiredStream = await getUserMediaWithSignal(constraints, signal);
    signal?.throwIfAborted();

    const videoElement = getVideoElementState();
    if (!videoElement) {
      throw new CameraNotFoundError('カメラ表示用のビデオ要素が見つかりません');
    }

    videoElement.srcObject = acquiredStream;
    await videoElement.play();
    signal?.throwIfAborted();

    let resolvedDeviceId = deviceId ?? null;

    const videoTrack = acquiredStream.getVideoTracks()[0];
    if (videoTrack && typeof videoTrack.getSettings === 'function') {
      const settings = videoTrack.getSettings();
      if (settings && typeof settings.deviceId === 'string' && settings.deviceId.length > 0) {
        resolvedDeviceId = settings.deviceId;
      }

      logger.debug('camera:start:success', {
        deviceId: resolvedDeviceId,
        width: settings?.width,
        height: settings?.height,
        facingMode: settings?.facingMode,
      });
    }

    setMediaStream(acquiredStream);
    setCurrentDeviceIdState(resolvedDeviceId);
    setState('scanner.stream', acquiredStream);

    return acquiredStream;
  } catch (error) {
    if (acquiredStream) {
      stopStreamTracks(acquiredStream);
    }
    if (!getMediaStream() || getMediaStream() === acquiredStream) {
      clearMediaStream();
      clearPendingVideo(acquiredStream);
    }

    if (signal?.aborted) {
      throw getAbortReason(signal);
    }

    if (error.name === 'NotAllowedError') {
      logger.info('camera:permission-required');
      throw new CameraPermissionError('カメラへのアクセスが拒否されました');
    }

    logger.error('カメラ起動エラー', error);

    if (error.name === 'NotFoundError') {
      throw new CameraNotFoundError('カメラが見つかりません');
    } else if (error.name === 'NotReadableError') {
      throw new CameraInUseError('カメラが他のアプリで使用中です');
    }

    throw error;
  }
}

export async function stop() {
  logger.debug('camera:stop');

  const stream = getMediaStream();
  if (stream) {
    stream.getTracks().forEach(track => {
      track.stop();
    });
    clearMediaStream();
  }

  const videoElement = getVideoElementState();
  if (videoElement) {
    videoElement.srcObject = null;
  }

  clearVideoElement();
  setCurrentDeviceIdState(null);
  setState('scanner.stream', null);
}

export function pause() {
  const videoElement = getVideoElementState();
  if (videoElement && !videoElement.paused) {
    videoElement.pause();
    logger.debug('カメラ一時停止');
  }
}

export async function resume() {
  const videoElement = getVideoElementState();
  if (videoElement && videoElement.paused) {
    await videoElement.play();
    logger.debug('カメラ再開');
  }
}

export function isActive() {
  const stream = getMediaStream();
  return Boolean(stream && stream.active);
}

export function getStream() {
  return getMediaStream();
}

export function getVideoElement() {
  return getVideoElementState();
}

export function getCurrentDeviceId() {
  return getCurrentDeviceIdState();
}

export function getDeviceList() {
  return getDeviceListState();
}
