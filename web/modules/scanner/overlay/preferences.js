/**
 * メディアクエリによる動作モード制御。
 */

import { logger } from '../../core/logger.js';

export function updateReduceMotionPreference(state) {
  try {
    if (typeof window.matchMedia !== 'function') {
      state.reduceMotion = false;
      return;
    }
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = (event) => {
      state.reduceMotion = !!event.matches;
    };
    apply(query);
    state.reduceMotionMediaQuery = query;
    if (typeof query.addEventListener === 'function') {
      query.addEventListener('change', apply);
      state.reduceMotionListener = apply;
    } else if (typeof query.addListener === 'function') {
      query.addListener(apply);
      state.reduceMotionListener = apply;
    }
  } catch (error) {
    logger.debug('reduce-motion クエリ失敗', { error });
    state.reduceMotion = false;
  }
}

export function detachReduceMotionListener(state) {
  if (!state.reduceMotionMediaQuery || !state.reduceMotionListener) {
    state.reduceMotionMediaQuery = null;
    state.reduceMotionListener = null;
    return;
  }
  const query = state.reduceMotionMediaQuery;
  const listener = state.reduceMotionListener;
  if (typeof query.removeEventListener === 'function') {
    query.removeEventListener('change', listener);
  } else if (typeof query.removeListener === 'function') {
    query.removeListener(listener);
  }
  state.reduceMotionMediaQuery = null;
  state.reduceMotionListener = null;
}
