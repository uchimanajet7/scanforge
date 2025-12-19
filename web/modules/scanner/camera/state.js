/**
 * カメラモジュール内部状態。
 */

let mediaStream = null;
let videoElement = null;
let deviceList = [];
let currentDeviceId = null;

export function getMediaStream() {
  return mediaStream;
}

export function setMediaStream(stream) {
  mediaStream = stream;
}

export function clearMediaStream() {
  mediaStream = null;
}

export function getVideoElement() {
  return videoElement;
}

export function setVideoElement(element) {
  videoElement = element;
}

export function clearVideoElement() {
  videoElement = null;
}

export function getDeviceList() {
  return [...deviceList];
}

export function setDeviceList(list) {
  deviceList = Array.isArray(list) ? [...list] : [];
}

export function getCurrentDeviceId() {
  return currentDeviceId;
}

export function setCurrentDeviceId(deviceId) {
  currentDeviceId = deviceId ?? null;
}

export function clearCurrentDeviceId() {
  currentDeviceId = null;
}
