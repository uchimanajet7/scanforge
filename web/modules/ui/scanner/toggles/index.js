import { createMirrorControls } from './mirror-controls.js';
import { createContinuousControls } from './continuous-controls.js';
import { createSoundControls } from './sound-controls.js';
import { createFormatControls } from './format-controls.js';
import { createToggleSharedHelpers } from './shared.js';

export default function createTogglesModule(context) {
  const shared = createToggleSharedHelpers({
    logger: context.logger,
    toast: context.toast,
    announce: context.announce,
  });

  const mirror = createMirrorControls({ ...context, shared });
  const continuous = createContinuousControls({ ...context, shared });
  const sound = createSoundControls({ ...context, shared });
  const format = createFormatControls({ ...context, shared });
  const orderedModules = [mirror, continuous, sound, format];

  function init() {
    orderedModules.forEach(module => module.init?.());
  }

  function destroy() {
    orderedModules.slice().reverse().forEach(module => module.destroy?.());
  }

  return {
    init,
    destroy,
    applyContinuousSetting: continuous.applyContinuousSetting,
    applySoundSetting: sound.applySoundSetting,
    applyAutoResumeDelaySetting: continuous.applyAutoResumeDelaySetting,
    setAutoResumeDelayEnabled: continuous.setAutoResumeDelayEnabled,
    updateMirrorClass: mirror.updateMirrorClass,
    toggleFormatsSelect: format.toggleFormatsSelect,
    getSelectedFormats: format.getSelectedFormats,
    setFormatsMode: format.setFormatsMode,
    syncManualFormats: format.syncManualFormats,
  };
}
