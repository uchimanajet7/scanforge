/**
 * ユーザーへのフィードバック表示をまとめたモジュール。
 */

import { logger } from '../core/logger.js';
import toast from '../ui/toast/manager.js';
import { elements } from './dom-cache.js';

function showTextError(message) {
  if (!elements.textError) {
    return;
  }
  elements.textError.textContent = message;
  elements.textError.hidden = false;
}

function hideTextError() {
  if (!elements.textError) {
    return;
  }
  elements.textError.hidden = true;
  elements.textError.textContent = '';
}

export { hideTextError, logger, showTextError, toast };
