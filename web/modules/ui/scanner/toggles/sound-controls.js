import { on } from '../../core/dom/events.js';

export function createSoundControls(context) {
  const { elements, state, shared } = context;
  const listeners = [];

  function handleSoundToggle(event) {
    const toggle = event.currentTarget || event.target;
    const next = !!toggle?.checked;
    const previous = !!state.getState('settings.playSound');
    if (next === previous) {
      shared.setSwitchState(elements.soundToggle, next);
      return;
    }
    shared.execSwitchUpdate(
      elements.soundToggle,
      next,
      () => state.updateSettings({ playSound: next }),
      {
        previous,
        logName: 'sound',
        announceMessage: next ? '検出時サウンドをオンにしました。' : '検出時サウンドをオフにしました。',
      },
    );
  }

  function applySoundSetting(value) {
    shared.setSwitchState(elements.soundToggle, !!value);
  }

  function init() {
    if (elements.soundToggle) {
      listeners.push(on(elements.soundToggle, 'change', handleSoundToggle));
    }
  }

  function destroy() {
    listeners.splice(0).forEach(off => off?.());
  }

  return {
    init,
    destroy,
    applySoundSetting,
  };
}
