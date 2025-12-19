/**
 * 状態購読ハブ
 */

export default function createSubscriptionsModule(context, modules) {
  const { state, logger } = context;
  const subscriptions = [];

  function subscribe(path, handler) {
    try {
      const unsub = state.subscribe(path, handler);
      if (typeof unsub === 'function') {
        subscriptions.push(unsub);
      }
    } catch (error) {
      logger.error('scanner:subscription:error', { path, error });
    }
  }

  function init() {
    subscribe('scanner.status', (status) => {
      modules.statusBar.updateStatus(status);
      modules.resumeProgress.handleStatusChange(status);
    });

    subscribe('scanner.devices', (devices) => {
      modules.deviceSelect.updateDeviceOptions(devices || []);
    });

    subscribe('scanner.selectedDevice', (deviceId) => {
      modules.deviceSelect.syncSelectedDevice(deviceId);
    });

    subscribe('scanner.isMirrored', (isMirrored) => {
      modules.toggles.updateMirrorClass(isMirrored);
    });

    subscribe('scanner.lastDetection', (detection) => {
      modules.latestResult.renderDetection(detection);
    });

    subscribe('history.items', (items) => {
      modules.historyPanel.renderHistoryList(items || []);
    });

    subscribe('settings.continuousScan', (value) => {
      modules.toggles.applyContinuousSetting(value);
    });

    subscribe('settings.playSound', (value) => {
      modules.toggles.applySoundSetting(value);
    });

    subscribe('settings.autoResumeDelayMs', (value) => {
      modules.toggles.applyAutoResumeDelaySetting(value);
    });

    subscribe('settings.scanMode', (mode) => {
      modules.deviceSelect.applyScanModeSetting(mode);
    });

    subscribe('settings.scanFormatsMode', (mode) => {
      modules.toggles.setFormatsMode(mode, { persist: false, silent: true });
    });

    subscribe('settings.scanFormatsManual', (manualValues) => {
      modules.toggles.syncManualFormats?.(manualValues, { fallback: true });
    });

    subscribe('scanner.autoResume', (autoResume) => {
      modules.resumeProgress.handleAutoResumeState(autoResume);
    });

    applyInitialState();
  }

  function applyInitialState() {
    modules.statusBar.updateStatus(state.getState('scanner.status'));
    modules.deviceSelect.updateDeviceOptions(state.getState('scanner.devices') || []);
    modules.deviceSelect.syncSelectedDevice(state.getState('scanner.selectedDevice'));
    modules.toggles.updateMirrorClass(state.getState('scanner.isMirrored'));
    modules.latestResult.renderDetection(state.getState('scanner.lastDetection'));
    modules.historyPanel.renderHistoryList(state.getState('history.items') || []);
    modules.toggles.applyContinuousSetting(state.getState('settings.continuousScan'));
    modules.toggles.applySoundSetting(state.getState('settings.playSound'));
    modules.toggles.applyAutoResumeDelaySetting(state.getState('settings.autoResumeDelayMs'));
    modules.deviceSelect.applyScanModeSetting(state.getState('settings.scanMode'));
    modules.toggles.syncManualFormats?.(state.getState('settings.scanFormatsManual'), { fallback: false });
    modules.toggles.setFormatsMode(state.getState('settings.scanFormatsMode'), { persist: false, silent: true });
    modules.resumeProgress.handleAutoResumeState(state.getState('scanner.autoResume'));
  }

  function destroy() {
    subscriptions.splice(0).forEach(unsub => {
      try {
        unsub && unsub();
      } catch (error) {
        logger.debug('scanner:subscription:cleanup-error', { error });
      }
    });
  }

  return {
    init,
    destroy,
  };
}
