import { attachWindowGuards } from './window-guards.js';
import { createDropzoneView } from './dropzone-view.js';

const noop = () => {};

function createNoopShell() {
  return {
    setState: noop,
    setDisabled: noop,
    announceStatus: noop,
    destroy: noop,
  };
}

export default function createUploaderShell(options = {}) {
  const {
    trigger,
    dropzone,
    input,
    root = dropzone?.closest('.uploader'),
    status,
    onFilesSelected,
    onError,
    onStateChange,
    magnetTargets = [],
    dependencies = {},
  } = options;

  if (!dropzone || !input) {
    return createNoopShell();
  }

  const guardFactory = dependencies.guardFactory || attachWindowGuards;
  const viewFactory = dependencies.viewFactory || createDropzoneView;
  const detachGuards = typeof guardFactory === 'function' ? guardFactory() : noop;
  const dropzoneView = viewFactory({
    dropzone,
    root,
    status,
    initialState: dropzone.dataset.state,
    onStateChange: state => {
      if (typeof onStateChange === 'function') {
        onStateChange(state);
      }
    },
  });

  if (!dropzoneView) {
    detachGuards();
    return createNoopShell();
  }

  const {
    setState: viewSetState,
    setDisabled: viewSetDisabled,
    announceStatus,
    isDisabled,
    getState: getViewState,
    teardown: teardownView,
  } = dropzoneView;

  const listeners = [];
  const extraDragTargets = Array.isArray(magnetTargets)
    ? magnetTargets.filter(target => target && target !== dropzone)
    : [];
  const handledEvents = new WeakSet();
  let dragDepth = 0;

  const shellApi = {
    setState: (nextState, options) => viewSetState(nextState, options),
    setDisabled: nextDisabled => viewSetDisabled(nextDisabled),
    announceStatus,
    destroy: () => {},
  };

  function emitFiles(files = [], meta = {}) {
    if (!files.length) {
      if (typeof onError === 'function') {
        onError('ファイルを取得できませんでした。');
      }
      return;
    }
    if (typeof onFilesSelected === 'function') {
      onFilesSelected(files, meta);
    }
  }

  function handleTriggerClick(event) {
    event?.preventDefault?.();
    if (isDisabled()) {
      return;
    }
    input.click();
  }

  function handleKeydown(event) {
    if (event.defaultPrevented || isDisabled()) {
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      input.click();
    }
  }

  function handleInputChange(event) {
    if (isDisabled()) {
      event.target.value = '';
      return;
    }
    const files = event.target.files ? Array.from(event.target.files) : [];
    emitFiles(files, { source: 'picker' });
    event.target.value = '';
  }

  function handleDragEvent(event) {
    if (handledEvents.has(event) && event.type === 'drop') {
      event.stopPropagation();
      return;
    }
    if (event.type === 'drop' && !isFileDrag(event)) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (!isFileDrag(event)) {
      return;
    }
    if (isDisabled()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }

    if (event.type === 'dragenter') {
      dragDepth += 1;
      viewSetState('active');
      return;
    }

    if (event.type === 'dragover') {
      return;
    }

    if (event.type === 'dragleave') {
      if (event.currentTarget.contains(event.relatedTarget)) {
        return;
      }
      dragDepth = Math.max(0, dragDepth - 1);
      if (dragDepth === 0) {
        viewSetState('idle');
      }
      return;
    }

    if (event.type === 'drop') {
      handledEvents.add(event);
      dragDepth = 0;
      viewSetState('idle');
      const files = extractFilesFromDataTransfer(event.dataTransfer);
      emitFiles(files, { source: 'drop' });
    }
  }

  function isFileDrag(event) {
    const types = event?.dataTransfer?.types;
    if (!types) {
      return false;
    }
    if (typeof types.includes === 'function') {
      return types.includes('Files');
    }
    return Array.from(types).indexOf('Files') !== -1;
  }

  function extractFilesFromDataTransfer(dataTransfer) {
    if (!dataTransfer) {
      return [];
    }
    if (dataTransfer.items && dataTransfer.items.length) {
      const files = Array.from(dataTransfer.items)
        .filter(item => item.kind === 'file')
        .map(item => item.getAsFile())
        .filter(Boolean);
      if (files.length) {
        return files;
      }
    }
    if (dataTransfer.files && dataTransfer.files.length) {
      return Array.from(dataTransfer.files);
    }
    return [];
  }

  if (trigger) {
    listeners.push(addEventListener(trigger, 'click', handleTriggerClick));
  }
  listeners.push(addEventListener(dropzone, 'click', handleTriggerClick));
  listeners.push(addEventListener(dropzone, 'keydown', handleKeydown));
  listeners.push(addEventListener(input, 'change', handleInputChange));
  listeners.push(addEventListener(dropzone, 'dragenter', handleDragEvent));
  listeners.push(addEventListener(dropzone, 'dragover', handleDragEvent));
  listeners.push(addEventListener(dropzone, 'dragleave', handleDragEvent));
  listeners.push(addEventListener(dropzone, 'drop', handleDragEvent));

  if (extraDragTargets.length) {
    const dragEvents = ['dragenter', 'dragover', 'dragleave', 'drop'];
    extraDragTargets.forEach(target => {
      dragEvents.forEach(eventName => {
        listeners.push(addEventListener(target, eventName, handleDragEvent));
      });
    });
  }

  function destroy() {
    listeners.splice(0).forEach(off => off());
    teardownView();
    detachGuards();
    dropzone.__uploaderShell = null;
  }

  shellApi.destroy = destroy;
  dropzone.__uploaderShell = shellApi;

  return shellApi;
}

function addEventListener(target, eventName, handler) {
  if (!target) {
    return noop;
  }
  target.addEventListener(eventName, handler);
  return () => target.removeEventListener(eventName, handler);
}
