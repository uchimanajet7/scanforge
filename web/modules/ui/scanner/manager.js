/**
 * スキャナー UI オーケストレーター
 */

import { logger } from '../../core/logger.js';
import state from '../../core/state/app-state.js';
import {
  formatDateTime,
  copyToClipboard,
  downloadBlob,
} from '../../core/utils.js';
import { APP_CONFIG } from '../../core/config/app-settings.js';
import { PRIMARY_BUTTON_STATES, STATUS_MESSAGES } from '../../core/config/scanner-ui.js';
import formats from '../../data/formats/catalog.js';
import scanner from '../../scanner/controller.js';
import toast from '../toast/manager.js';
import { get as getElement, clearCache } from '../core/dom/query.js';
import { announce as announceMessage } from '../core/core.js';

import createStatusBarModule from './status-bar.js';
import createPrimaryControlModule from './primary-control.js';
import createTogglesModule from './toggles/index.js';
import createDeviceSelectModule from './device-select.js';
import createLatestResultModule from './latest-result.js';
import createHistoryPanelModule from './history-panel.js';
import createResumeProgressModule from './resume-progress.js';
import createSubscriptionsModule from './subscriptions.js';

const DETECTION_ANNOUNCE_MESSAGE = '最新の検出結果を更新しました。コピーできます。';
const COPY_SUCCESS_MESSAGE = '内容をコピーしました。';

const ELEMENT_SELECTORS = {
  root: '.scan-controls',
  video: '#scanVideo',
  videoFrame: '.video-frame',
  primaryBtn: '#scanPrimaryBtn',
  captureBtn: '#captureImageBtn',
  statusContainer: '#scanStatus',
  statusPrimary: '#scanStatusPrimary',
  statusSecondary: '#scanStatusSecondary',
  mirrorToggle: '#quickMirrorToggle',
  continuousToggle: '#quickContinuousToggle',
  soundToggle: '#quickSoundToggle',
  autoResumeDelayInput: '#autoResumeDelayInput',
  deviceSelect: '#cameraDeviceSelect',
  modeSelect: '#scanModeSelect',
  formatsSelect: '#scanFormatsSelect',
  formatsAutoSwitch: '#scanFormatsAutoToggle',
  formatsManualRegion: '#manualFormatsRegion',
  formatsGroup: '.format-detection',
  formatsNotice: '#scanFormatsNotice',
  resumeProgress: '#resumeProgress',
  resumeProgressLabel: '#resumeProgressLabel',
  latestFormat: '#latestFormat',
  latestText: '#latestText',
  latestSource: '#latestSource',
  latestTime: '#latestTime',
  copyLatestBtn: '#copyLatestContentBtn',
  historyList: '#historyList',
  historyTemplate: '#historyItemTemplate',
  clearHistoryBtn: '#clearHistoryBtn',
  exportHistoryBtn: '#exportHistoryBtn',
};

function collectElements() {
  const entries = Object.entries(ELEMENT_SELECTORS);
  const result = {};
  for (const [key, selector] of entries) {
    result[key] = getElement(selector);
  }
  return result;
}

export function initScanControlsUI(options = {}) {
  clearCache();
  const elements = collectElements();
  if (!elements.root || !elements.primaryBtn || !elements.video) {
    logger.warn('scanner:init:missing-elements', {
      hasRoot: !!elements.root,
      hasPrimary: !!elements.primaryBtn,
      hasVideo: !!elements.video,
    });
    return () => {};
  }

  const context = {
    elements,
    state,
    logger,
    scanner,
    toast,
    formats,
    formatDateTime,
    copyToClipboard,
    downloadBlob,
    announce: options.announce || announceMessage,
    config: {
      announceDetection: DETECTION_ANNOUNCE_MESSAGE,
      announceCopySuccess: COPY_SUCCESS_MESSAGE,
      primaryButtonStates: PRIMARY_BUTTON_STATES,
      statusMessages: STATUS_MESSAGES,
      app: APP_CONFIG,
    },
    cleanup: [],
  };

  const statusBar = createStatusBarModule(context);
  const toggles = createTogglesModule(context);
  const deviceSelect = createDeviceSelectModule(context);
  const latestResult = createLatestResultModule(context);
  const historyPanel = createHistoryPanelModule(context);
  const resumeProgress = createResumeProgressModule(context);
  const primaryControl = createPrimaryControlModule(context, {
    statusBar,
    toggles,
    deviceSelect,
    resumeProgress,
  });
  const subscriptions = createSubscriptionsModule(context, {
    statusBar,
    primaryControl,
    toggles,
    deviceSelect,
    latestResult,
    historyPanel,
    resumeProgress,
  });

  const modules = [
    statusBar,
    toggles,
    deviceSelect,
    latestResult,
    historyPanel,
    resumeProgress,
    primaryControl,
    subscriptions,
  ];

  modules.forEach(module => module.init?.());

  logger.debug('scanner:init:complete');

  return () => {
    modules.slice().reverse().forEach(module => module.destroy?.());
    context.cleanup.forEach(fn => {
      try {
        fn?.();
      } catch (error) {
        logger.debug('scanner:cleanup:error', { error });
      }
    });
  };
}

export default {
  initScanControlsUI,
};
