export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function createToggleSharedHelpers({ logger, toast, announce }) {
  function logToggle(name, payload) {
    if (!name || !logger?.debug) return;
    logger.debug(`ui:toggle:${name}`, payload);
  }

  function logToggleError(name, error) {
    if (!logger?.error) return;
    const channel = name ? `ui:toggle:${name}:failed` : 'ui:toggle:failed';
    logger.error(channel, { error });
  }

  function announceChange(message) {
    if (typeof announce === 'function' && message) {
      announce(message);
    }
  }

  function execSwitchUpdate(element, next, work, {
    previous,
    logName,
    onSuccess,
    onError,
    announceMessage,
  } = {}) {
    if (!element) return;
    const fallbackValue = typeof previous === 'boolean' ? previous : !next;
    setSwitchState(element, next);
    setSwitchDisabled(element, true);
    try {
      work?.(next);
      if (logName) {
        logToggle(logName, { enabled: next });
      }
      if (typeof onSuccess === 'function') {
        onSuccess();
      }
      if (announceMessage) {
        announceChange(announceMessage);
      }
    } catch (error) {
      if (logName) {
        logToggleError(logName, error);
      } else {
        logToggleError(null, error);
      }
      toast?.error?.('設定の更新に失敗しました。もう一度お試しください。');
      setSwitchState(element, fallbackValue);
      if (typeof onError === 'function') {
        onError(error);
      }
    } finally {
      setSwitchDisabled(element, false);
    }
  }

  return {
    logToggle,
    logToggleError,
    announceChange,
    execSwitchUpdate,
    setSwitchDisabled,
    setSwitchState,
  };
}

function getSettingCard(element) {
  if (!element) return null;
  return element.closest('.setting-card');
}

function setSwitchDisabled(element, disabled) {
  if (!element) return;
  const isDisabled = !!disabled;
  element.disabled = isDisabled;
  element.setAttribute('aria-disabled', isDisabled ? 'true' : 'false');
  const container = getSettingCard(element);
  if (container) {
    container.classList.toggle('is-disabled', isDisabled);
    if (isDisabled) {
      container.setAttribute('aria-disabled', 'true');
    } else {
      container.removeAttribute('aria-disabled');
    }
    const label = container.querySelector('.setting-card-toggle');
    if (label) {
      if (isDisabled) {
        label.setAttribute('aria-disabled', 'true');
      } else {
        label.removeAttribute('aria-disabled');
      }
    }
  }
}

function setSwitchState(element, value) {
  if (!element) return;
  const checked = !!value;
  element.checked = checked;
  element.setAttribute('aria-checked', checked ? 'true' : 'false');
  const container = getSettingCard(element);
  if (container) {
    container.classList.toggle('is-on', checked);
  }
}
