/**
 * ファイル投入 UI 制御
 */

import createUploaderShell from '../uploader/shell.js';

export default function createDropzoneModule(context) {
  const { elements, toast, invokeSelectFiles } = context;

  let shell = null;

  function init() {
    if (!elements.dropzone || !elements.input) {
      return;
    }
    shell = createUploaderShell({
      trigger: elements.trigger,
      dropzone: elements.dropzone,
      input: elements.input,
      root: elements.card,
      status: elements.uploaderStatus,
      magnetTargets: elements.card ? [elements.card] : [],
      onFilesSelected: (files, meta) => {
        if (!files || !files.length) {
          toast.error('画像ファイルを取得できませんでした。');
          return;
        }
        invokeSelectFiles(files);
      },
      onError: (message) => {
        toast.error(message || '画像ファイルを取得できませんでした。');
      },
      onStateChange: (state) => {
        if (!elements.section) {
          return;
        }
        if (state === 'active') {
          elements.section.dataset.dropState = 'active';
        } else {
          delete elements.section.dataset.dropState;
        }
      },
    });
  }

  function destroy() {
    shell?.destroy();
    shell = null;
  }

  function refreshAvailability() {
    if (!elements.section) {
      return;
    }
    const isLoading = elements.section.dataset.state === 'loading';
    shell?.setDisabled(isLoading);
  }

  return {
    init,
    destroy,
    refreshAvailability,
    setState: (state, options) => shell?.setState(state, options),
    announceStatus: (message, variant) => shell?.announceStatus(message, variant),
  };
}
