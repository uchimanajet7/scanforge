/**
 * デバイス選択とスキャンモード制御
 */

import { on } from '../core/dom/events.js';

function mapSelectModeToSetting(value) {
  switch (value) {
    case 'barcode-detector':
      return 'barcodeDetector';
    case 'zxing':
      return 'zxing';
    default:
      return 'auto';
  }
}

function mapSettingModeToSelect(value) {
  switch (value) {
    case 'barcodeDetector':
      return 'barcode-detector';
    case 'zxing':
      return 'zxing';
    default:
      return 'auto';
  }
}

export default function createDeviceSelectModule(context) {
  const { elements, state, scanner, logger } = context;

  const listeners = [];
  let deviceChangeListenerAttached = false;

  function init() {
    if (elements.deviceSelect) {
      const initialValue = elements.deviceSelect.value || null;
      state.setState('scanner.selectedDevice', initialValue);
      listeners.push(on(elements.deviceSelect, 'change', handleDeviceChange));
    }

    if (elements.modeSelect) {
      listeners.push(on(elements.modeSelect, 'change', handleModeChange));
    }

    attachDeviceChangeListener();
  }

  function destroy() {
    listeners.splice(0).forEach(off => off());
  }

  function handleDeviceChange(event) {
    const newDeviceId = event.target.value || null;
    state.setState('scanner.selectedDevice', newDeviceId);

    const status = state.getState('scanner.status');
    if (status === 'scanning') {
      scanner.switchCamera(newDeviceId).catch(error => {
        logger.error('scanner:device:switch-error', error);
      });
    }
  }

  function handleModeChange(event) {
    const value = event.target.value;
    const mapped = mapSelectModeToSetting(value);
    state.updateSettings({ scanMode: mapped });
  }

  function attachDeviceChangeListener() {
    if (deviceChangeListenerAttached) {
      return;
    }

    const mediaDevices = navigator.mediaDevices;
    if (!mediaDevices) {
      return;
    }

    const handler = () => {
      refreshDevices().catch(error => {
        logger.debug('scanner:device:refresh-failed', { error });
      });
    };

    if (typeof mediaDevices.addEventListener === 'function') {
      mediaDevices.addEventListener('devicechange', handler);
      deviceChangeListenerAttached = true;
    } else if ('ondevicechange' in mediaDevices) {
      mediaDevices.ondevicechange = handler;
      deviceChangeListenerAttached = true;
    }
  }

  function updateDeviceOptions(devices) {
    if (!elements.deviceSelect) return;

    const previousValue = elements.deviceSelect.value;
    elements.deviceSelect.innerHTML = '';

    if (!Array.isArray(devices) || devices.length === 0) {
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'デバイス未検出';
      elements.deviceSelect.appendChild(placeholder);
      elements.deviceSelect.disabled = true;
      return;
    }

    const autoOption = document.createElement('option');
    autoOption.value = '';
    autoOption.textContent = '自動選択';
    elements.deviceSelect.appendChild(autoOption);

    devices.forEach(device => {
      const option = document.createElement('option');
      option.value = device.deviceId;
      option.textContent = device.label || `カメラ (${device.deviceId.slice(0, 8)})`;
      elements.deviceSelect.appendChild(option);
    });

    elements.deviceSelect.disabled = false;
    const selected = state.getState('scanner.selectedDevice');
    elements.deviceSelect.value = selected ?? previousValue ?? '';
  }

  function syncSelectedDevice(deviceId) {
    const nextValue = deviceId || '';
    if (elements.deviceSelect && elements.deviceSelect.value !== nextValue) {
      elements.deviceSelect.value = nextValue;
    }
  }

  function applyScanModeSetting(mode) {
    if (!elements.modeSelect) return;
    const mapped = mapSettingModeToSelect(mode);
    elements.modeSelect.value = mapped;
  }

  function getSelectedDeviceId() {
    return elements.deviceSelect?.value || null;
  }

  async function refreshDevices() {
    try {
      await scanner.refreshDeviceList();
    } catch (error) {
      logger.debug('scanner:device:refresh-error', { error });
    }
  }

  return {
    init,
    destroy,
    updateDeviceOptions,
    syncSelectedDevice,
    applyScanModeSetting,
    refreshDevices,
    getSelectedDeviceId,
  };
}
