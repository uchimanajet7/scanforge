import { on } from '../../core/dom/events.js';

export function createMirrorControls(context) {
  const { elements, state, shared } = context;
  const listeners = [];

  function handleMirrorToggle(event) {
    const target = event.currentTarget || event.target;
    toggleMirrorPreference(!!target?.checked);
  }

  function toggleMirrorPreference(nextState) {
    if (!elements.mirrorToggle) return;
    const current = !!state.getState('scanner.isMirrored');
    const target = typeof nextState === 'boolean' ? nextState : !current;
    if (target === current) {
      shared.setSwitchState(elements.mirrorToggle, current);
      return;
    }

    shared.setSwitchDisabled(elements.mirrorToggle, true);
    try {
      const updated = state.setGlobalMirrorPreference(target);
      shared.setSwitchState(elements.mirrorToggle, updated);
      shared.logToggle('mirror', { enabled: updated });
      shared.announceChange(updated ? '鏡像表示をオンにしました。' : '鏡像表示をオフにしました。');
    } catch (error) {
      shared.logToggleError('mirror', error);
      context.toast?.error?.('鏡像表示の切り替えに失敗しました。');
      shared.setSwitchState(elements.mirrorToggle, current);
    } finally {
      shared.setSwitchDisabled(elements.mirrorToggle, false);
    }
  }

  function handleMirrorShortcut(event) {
    if (event.defaultPrevented) return;
    const key = event.key;
    if (!key || (key !== 'm' && key !== 'M')) return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;

    const target = event.target;
    if (target) {
      const tagName = target.tagName?.toLowerCase();
      if (tagName && ['input', 'textarea', 'select'].includes(tagName)) {
        return;
      }
      if (target.isContentEditable) {
        return;
      }
    }

    event.preventDefault();
    toggleMirrorPreference();
    elements.mirrorToggle?.focus?.();
  }

  function updateMirrorClass(isMirrored) {
    const mirrored = !!isMirrored;
    if (elements.videoFrame) {
      elements.videoFrame.classList.toggle('is-mirrored', mirrored);
      elements.videoFrame.setAttribute('data-mirrored', mirrored ? 'true' : 'false');
    }
    if (elements.mirrorToggle) {
      shared.setSwitchState(elements.mirrorToggle, mirrored);
      elements.mirrorToggle.setAttribute('title', '鏡像表示');
      elements.mirrorToggle.setAttribute('aria-label', '鏡像表示');
      shared.setSwitchDisabled(elements.mirrorToggle, false);
    }
  }

  function init() {
    if (elements.mirrorToggle) {
      listeners.push(on(elements.mirrorToggle, 'change', handleMirrorToggle));
      elements.mirrorToggle.setAttribute('aria-keyshortcuts', 'M');
    }
    listeners.push(on(window, 'keydown', handleMirrorShortcut));
  }

  function destroy() {
    listeners.splice(0).forEach(off => {
      try {
        off?.();
      } catch (error) {
        shared.logToggleError('mirror', error);
      }
    });
  }

  return {
    init,
    destroy,
    updateMirrorClass,
  };
}
