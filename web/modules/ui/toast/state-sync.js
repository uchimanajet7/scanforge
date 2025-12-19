/**
 * トースト状態同期
 */

export function registerToast(state, record) {
  state.addToast(record);
}

export function removeToast(state, id) {
  state.removeToast(id);
}

export function observeToasts(state, logger) {
  return state.subscribe('ui.toasts', (toasts) => {
    logger.debug('toast:state-update', { count: toasts.length });
  });
}
