import { on } from '../../core/dom/events.js';
import { clamp } from './shared.js';

export function createContinuousControls(context) {
  const { elements, state, config, shared } = context;
  const { app } = config;
  const listeners = [];

  function handleContinuousToggle(event) {
    const toggle = event.currentTarget || event.target;
    const next = !!toggle?.checked;
    const previous = !!state.getState('settings.continuousScan');
    if (next === previous) {
      shared.setSwitchState(elements.continuousToggle, next);
      return;
    }
    shared.execSwitchUpdate(
      elements.continuousToggle,
      next,
      () => state.updateSettings({ continuousScan: next }),
      {
        previous,
        logName: 'continuous',
        onSuccess: () => setAutoResumeDelayEnabled(next),
        onError: () => setAutoResumeDelayEnabled(previous),
        announceMessage: next ? '連続スキャンをオンにしました。' : '連続スキャンをオフにしました。',
      },
    );
  }

  function handleAutoResumeDelayChange(event) {
    const rawValue = parseInt(event.target.value, 10);
    const clamped = clamp(rawValue, app.AUTO_RESUME_MIN_MS, app.AUTO_RESUME_MAX_MS);
    event.target.value = clamped;
    state.updateSettings({ autoResumeDelayMs: clamped });
  }

  function setAutoResumeDelayEnabled(enabled) {
    if (!elements.autoResumeDelayInput) return;
    const isEnabled = !!enabled;
    elements.autoResumeDelayInput.disabled = !isEnabled;
    elements.autoResumeDelayInput.setAttribute('aria-disabled', String(!isEnabled));
    const body = getContinuousCardBody();
    if (body) {
      body.dataset.delayState = isEnabled ? 'enabled' : 'disabled';
    }
    const hint = body?.querySelector('.setting-card-hint');
    if (hint) {
      hint.hidden = isEnabled;
    }
  }

  function applyContinuousSetting(value) {
    const enabled = !!value;
    shared.setSwitchState(elements.continuousToggle, enabled);
    setAutoResumeDelayEnabled(enabled);
  }

  function applyAutoResumeDelaySetting(value) {
    if (!elements.autoResumeDelayInput) return;
    const clamped = clamp(
      Number(value) || app.AUTO_RESUME_DEFAULT_MS,
      app.AUTO_RESUME_MIN_MS,
      app.AUTO_RESUME_MAX_MS,
    );
    elements.autoResumeDelayInput.value = clamped;
  }

  function getContinuousCardBody() {
    if (!elements.autoResumeDelayInput) return null;
    return elements.autoResumeDelayInput.closest('.continuous-body');
  }

  function init() {
    if (elements.continuousToggle) {
      listeners.push(on(elements.continuousToggle, 'change', handleContinuousToggle));
    }
    if (elements.autoResumeDelayInput) {
      listeners.push(on(elements.autoResumeDelayInput, 'change', handleAutoResumeDelayChange));
      listeners.push(on(elements.autoResumeDelayInput, 'blur', handleAutoResumeDelayChange));
    }
  }

  function destroy() {
    listeners.splice(0).forEach(off => off?.());
  }

  return {
    init,
    destroy,
    applyContinuousSetting,
    applyAutoResumeDelaySetting,
    setAutoResumeDelayEnabled,
  };
}
