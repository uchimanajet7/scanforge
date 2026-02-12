/**
 * 検出後の副作用を集約するモジュール。オーバーレイ更新、履歴登録、通知を行う。
 */

function playDetectionSound(logger) {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  } catch (error) {
    logger.error('検出音再生エラー', error);
  }
}

export function applyDetectionEffects(accepted, {
  overlay,
  setState,
  addHistoryEntry,
  getState,
  toast,
  logger,
}) {
  if (!Array.isArray(accepted) || accepted.length === 0) {
    return;
  }

  overlay.updateDetections(accepted);

  const primaryDetection = accepted[0];
  const lastDetection = {
    ...primaryDetection,
    metadata: {
      engine: primaryDetection.engine,
      source: primaryDetection.source,
      boundingBox: primaryDetection.boundingBox,
      timestamp: primaryDetection.timestamp,
    },
  };
  setState('scanner.lastDetection', lastDetection);

  accepted.forEach((detection) => {
    addHistoryEntry({
      text: detection.text,
      format: detection.format,
      metadata: {
        engine: detection.engine,
        source: detection.source,
        boundingBox: detection.boundingBox,
        timestamp: detection.timestamp,
      },
    });
  });

  if (getState('settings.playSound')) {
    playDetectionSound(logger);
  }

  accepted.forEach(detection => {
    toast.notifyDetection(detection);
  });
}
