/**
 * 生成モジュールのエントリーポイント。
 * サブモジュールを組み合わせて初期化処理を実行する。
 */

import { logger } from '../core/logger.js';
import { cacheElements, requireElements } from './dom-cache.js';
import { initializeControls } from './controls.js';
import { resetLogoColor, updateLogoPriorityAvailability } from './logo/manager.js';
import { bindEvents } from './actions/index.js';
import { isInitialized, markInitialized } from './context.js';

const REQUIRED_ELEMENTS = [
  'form',
  'textInput',
  'formatSelect',
  'outputSelect',
  'sizeSlider',
  'sizeInput',
  'previewContainer',
  'downloadBtn',
  'copyBtn',
];

export function initGenerator() {
  if (isInitialized()) {
    return;
  }
  cacheElements();
  requireElements(REQUIRED_ELEMENTS);
  initializeControls({
    onResetLogoColor: () => resetLogoColor(),
    onLogoPriorityAvailability: updateLogoPriorityAvailability,
  });
  bindEvents();
  markInitialized();
  logger.info('generator:simple-init');
}
