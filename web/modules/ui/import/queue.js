import { renderQueue } from './queue/renderers.js';

export default function createQueueModule(context) {
  const { elements, formats, formatDateTime, logger } = context;

  function render(queue) {
    renderQueue(queue, {
      container: elements.queue,
      formats,
      formatDateTime,
      logger,
      document: context.document ?? window.document,
    });
  }

  return {
    init() {},
    destroy() {},
    render,
  };
}
