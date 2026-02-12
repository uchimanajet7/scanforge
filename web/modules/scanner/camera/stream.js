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

export async function start(video, options = {}) {
  const {
    deviceId = null,
    facingMode = 'environment',
    width = APP_CONFIG.VIDEO_IDEAL_WIDTH,
    height = APP_CONFIG.VIDEO_IDEAL_HEIGHT,
  } = options;

  logger.debug('camera:start', { deviceId, facingMode });

  try {
    if (!video) {
      throw new CameraNotFoundError('カメラ表示用のビデオ要素が見つかりません');
    }

    if (getMediaStream()) {
      await stop();
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

    const stream = await navigator.mediaDevices.getUserMedia(constraints);

    const videoElement = getVideoElementState();
    if (!videoElement) {
      throw new CameraNotFoundError('カメラ表示用のビデオ要素が見つかりません');
    }

    videoElement.srcObject = stream;
    await videoElement.play();

    let resolvedDeviceId = deviceId ?? null;

    const videoTrack = stream.getVideoTracks()[0];
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

    setMediaStream(stream);
    setCurrentDeviceIdState(resolvedDeviceId);
    setState('scanner.stream', stream);

    return stream;
  } catch (error) {
    logger.error('カメラ起動エラー', error);

    if (error.name === 'NotAllowedError') {
      throw new CameraPermissionError('カメラへのアクセスが拒否されました');
    } else if (error.name === 'NotFoundError') {
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
