/**
 * 主要操作ボタン制御
 */

import { on } from '../core/dom/events.js';
import { clearCache } from '../core/dom/query.js';

export default function createPrimaryControlModule(context, deps) {
  const { elements, state, scanner, logger } = context;
  const { statusBar, toggles, deviceSelect } = deps;

  const listeners = [];

  function init() {
    if (elements.primaryBtn) {
      listeners.push(on(elements.primaryBtn, 'click', handlePrimaryClick));
    }
    if (elements.captureBtn) {
      listeners.push(on(elements.captureBtn, 'click', handleCaptureClick));
    }
  }

  function destroy() {
    listeners.splice(0).forEach(off => off());
  }

  async function handlePrimaryClick(event) {
    event.preventDefault();

    clearCache();
    let videoElement = elements.video;
    if (!videoElement || !videoElement.isConnected) {
      videoElement = document.querySelector('#scanVideo');
      if (videoElement instanceof HTMLVideoElement) {
        elements.video = videoElement;
      }
    }

    if (!(videoElement instanceof HTMLVideoElement)) {
      logger.warn('scanner:primary:no-video');
      return;
    }

    const status = state.getState('scanner.status');
    if (status === 'scanning' || status === 'initializing' || status === 'autoResume') {
      statusBar.setPrimaryButtonState('starting', true);
      try {
        await scanner.stopScan();
      } catch (error) {
        logger.error('scanner:primary:stop-error', error);
      } finally {
        statusBar.setPrimaryButtonState('idle');
      }
      return;
    }

    const deviceId = deviceSelect.getSelectedDeviceId();
    const formats = toggles.getSelectedFormats();

    statusBar.setPrimaryButtonState('starting', true);
    try {
      await scanner.startScan(videoElement, { deviceId, formats });
      await deviceSelect.refreshDevices();
    } catch (error) {
      logger.error('scanner:primary:start-error', error);
      statusBar.setPrimaryButtonState('idle');
    }
  }

  async function handleCaptureClick(event) {
    event.preventDefault();
    try {
      await scanner.scanCurrentFrame();
    } catch (error) {
      logger.error('scanner:capture:error', error);
    }
  }

  return {
    init,
    destroy,
    setPrimaryButtonState: statusBar.setPrimaryButtonState,
  };
}
