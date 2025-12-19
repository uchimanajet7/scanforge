import { elements } from '../dom-cache.js';
import {
  bindLogoDropzone,
  handleLogoChange,
  handleLogoPriorityChange,
  handleLogoToggleChange,
  handleLogoModeChange,
  updateLogoAvailability,
  setLogoPriorityToggleLoading,
} from '../logo/manager.js';
import { invalidatePreview } from '../preview/state.js';
import { logger } from '../feedback.js';

const LOGO_DRAWING_CHANGED = 'ロゴ描画設定が変更されました。バーコードを再生成してください。';
const LOGO_PRIORITY_CHANGED = 'ロゴ優先設定が変更されました。バーコードを再生成してください。';
const LOGO_MODE_CHANGED = 'ロゴ優先プリセットが変更されました。バーコードを再生成してください。';

export function createLogoPriorityControls({ runGenerate }) {
  const removeListeners = [];

  function init() {
    addListener(elements.logoInput, 'change', handleLogoChange);
    addListener(elements.logoToggle, 'change', onLogoToggleChange);
    addListener(elements.logoPriorityToggle, 'change', onLogoPriorityToggle);
    addListener(elements.logoModeTabs, 'click', onLogoModeTabsClick);
    bindLogoDropzone();
    updateLogoAvailability();
  }

  function destroy() {
    removeListeners.splice(0).forEach(off => off?.());
  }

  function onLogoToggleChange(event) {
    const result = handleLogoToggleChange(event);
    if (!result?.toggled) {
      if (result?.reason) {
        logger.debug('ui:toggle:logo:block', result);
      }
      return;
    }
    logger.debug('ui:toggle:logo', { enabled: result.enabled });
    invalidatePreview(LOGO_DRAWING_CHANGED);
  }

  async function onLogoPriorityToggle(event) {
    const result = handleLogoPriorityChange(event);
    if (!result || result.toggled === false) {
      if (result?.reason) {
        logger.debug('ui:toggle:logo-priority:block', result);
      }
      return;
    }
    logger.debug('ui:toggle:logo-priority', { enabled: result.enabled });
    setLogoPriorityToggleLoading(true);
    try {
      const hasText = !!elements.textInput?.value.trim();
      if (hasText) {
        const outcome = await runGenerate?.({ silent: true });
        if (!outcome?.success) {
          logger.warn('ui:toggle:logo-priority:generate-incomplete', { enabled: result.enabled });
        }
      }
      invalidatePreview(LOGO_PRIORITY_CHANGED);
    } catch (error) {
      logger.error('ui:toggle:logo-priority:error', { error });
    } finally {
      setLogoPriorityToggleLoading(false);
    }
  }

  function onLogoModeTabsClick(event) {
    const result = handleLogoModeChange(event);
    if (!result?.changed) {
      return;
    }
    logger.debug('ui:logo-mode-change', { mode: result.mode });
    invalidatePreview(LOGO_MODE_CHANGED);
  }

  function addListener(target, type, handler) {
    if (!target || typeof handler !== 'function') {
      return;
    }
    target.addEventListener(type, handler);
    removeListeners.push(() => target.removeEventListener(type, handler));
  }

  return {
    init,
    destroy,
  };
}
