/**
 * 状態購読
 */

export default function createBindingsModule(context, modules) {
  const { state } = context;

  let unsubscribe = null;

  function init() {
    if (unsubscribe) {
      unsubscribe();
    }
    unsubscribe = state.subscribe('scanner.image', handleImageState);
    handleImageState(state.getState('scanner.image') || {});
  }

  function handleImageState(imageState = {}) {
    const queue = Array.isArray(imageState.queue) ? imageState.queue : [];
    modules.summary.render(imageState, queue);
    modules.queue.render(queue);
    modules.dropzone.refreshAvailability();
  }

  function destroy() {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  }

  return {
    init,
    destroy,
  };
}
