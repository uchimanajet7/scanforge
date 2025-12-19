/**
 * レイアウト関連ユーティリティ
 */

import { logger } from '../../core/logger.js';
import { setState } from '../../core/state/base.js';

export function updateViewportHeight() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}

export function evaluateBreakpoints(width = window.innerWidth) {
  return {
    mobile: width < 640,
    tablet: width >= 640 && width < 1024,
    desktop: width >= 1024,
  };
}

export function handleResize() {
  updateViewportHeight();
  const width = window.innerWidth;
  const breakpoints = evaluateBreakpoints(width);
  setState('ui.breakpoint', breakpoints);
  logger.debug('ui:resize', { width, breakpoints });
}

export default {
  updateViewportHeight,
  evaluateBreakpoints,
  handleResize,
};
