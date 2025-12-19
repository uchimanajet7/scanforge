/**
 * カメラデバイスの列挙と切り替え。
 */

import { logger } from '../../core/logger.js';
import { setState } from '../../core/state/base.js';
import {
  getMediaStream,
  getVideoElement as getVideoElementState,
  getDeviceList as getDeviceListState,
  setDeviceList,
  getCurrentDeviceId as getCurrentDeviceIdState,
} from './state.js';
import { start, resume } from './stream.js';

let deviceChangeListenerRegistered = false;

export async function enumerateDevices() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices
      .filter(device => device.kind === 'videoinput')
      .map(device => ({
        deviceId: device.deviceId,
        label: device.label || `カメラ ${device.deviceId.slice(0, 8)}`,
        groupId: device.groupId,
      }));

    setDeviceList(videoDevices);
    setState('scanner.devices', videoDevices);

    logger.debug('camera:list-devices', { count: videoDevices.length });
    return videoDevices;
  } catch (error) {
    logger.error('デバイス列挙エラー', error);
    return [];
  }
}

export async function switchDevice(deviceId) {
  const currentDeviceId = getCurrentDeviceIdState();
  if (!deviceId || deviceId === currentDeviceId) {
    return getMediaStream();
  }

  logger.debug('camera:switch', { from: currentDeviceId, to: deviceId });

  const videoElement = getVideoElementState();
  const wasPlaying = videoElement && !videoElement.paused;

  const stream = await start(videoElement, { deviceId });

  if (wasPlaying) {
    await resume();
  }

  return stream;
}

export async function switchToNextCamera() {
  const devices = getDeviceListState();
  if (devices.length <= 1) {
    logger.debug('camera:no-alternative');
    return getMediaStream();
  }

  const currentDeviceId = getCurrentDeviceIdState();
  const currentIndex = devices.findIndex(device => device.deviceId === currentDeviceId);
  const nextIndex = (currentIndex + 1) % devices.length;
  const nextDevice = devices[nextIndex];

  if (!nextDevice) {
    return getMediaStream();
  }

  return switchDevice(nextDevice.deviceId);
}

export async function init() {
  await enumerateDevices();

  if (!deviceChangeListenerRegistered && navigator.mediaDevices?.addEventListener) {
    navigator.mediaDevices.addEventListener('devicechange', async () => {
      logger.debug('camera:device-change-detected');
      await enumerateDevices();
    });
    deviceChangeListenerRegistered = true;
  }

  logger.debug('camera:init:complete');
}
