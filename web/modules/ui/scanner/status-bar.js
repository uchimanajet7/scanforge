/**
 * ステータスバー管理
 */

export default function createStatusBarModule(context) {
  const { elements, config } = context;
  const { primaryButtonStates, statusMessages } = config;

  function setPrimaryButtonState(stateKey, forceDisabled = false) {
    if (!elements.primaryBtn) return;
    const configEntry = primaryButtonStates[stateKey] || primaryButtonStates.idle;

    elements.primaryBtn.textContent = configEntry.label;
    elements.primaryBtn.className = `action-btn primary ${configEntry.variant || ''}`.trim();
    elements.primaryBtn.disabled = configEntry.disabled || forceDisabled;
    elements.primaryBtn.setAttribute('data-mode', stateKey);
  }

  function updateCaptureButtonState(status) {
    if (!elements.captureBtn) return;
    const enabled = status === 'scanning' || status === 'pausedDetection';
    elements.captureBtn.disabled = !enabled;
  }

  function derivePrimaryStatusText(status) {
    switch (status) {
      case 'permissionDenied':
        return 'カメラへのアクセスが許可されていません。';
      case 'cameraNotFound':
        return '使用可能なカメラが見つかりません。';
      case 'cameraInUse':
        return 'カメラが他のアプリで使用中です。';
      case 'autoResumeFailed':
        return '自動再開に失敗しました。';
      case 'startFailed':
        return 'カメラを開始できませんでした。';
      default:
        return 'カメラの準備ができていません。';
    }
  }

  function updateStatusMessage(status) {
    if (!elements.statusPrimary || !elements.statusSecondary) return;

    const message = statusMessages[status] || {
      primary: derivePrimaryStatusText(status),
      secondary: '',
    };

    elements.statusPrimary.textContent = message.primary;
    elements.statusSecondary.textContent = message.secondary || '';
  }

  function mapStatusToButtonState(status) {
    switch (status) {
      case 'initializing':
        return 'starting';
      case 'scanning':
        return 'scanning';
      case 'pausedDetection':
        return 'pausedDetection';
      case 'pausedManual':
        return 'pausedManual';
      case 'autoResume':
        return 'pausedDetection';
      case 'autoResumeFailed':
        return 'pausedManual';
      default:
        return 'idle';
    }
  }

  function updateStatus(status) {
    setPrimaryButtonState(mapStatusToButtonState(status));
    updateStatusMessage(status);
    updateCaptureButtonState(status);
  }

  return {
    init() {},
    updateStatus,
    setPrimaryButtonState,
    destroy() {},
  };
}
