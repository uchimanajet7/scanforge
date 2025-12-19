/**
 * デバッグ向けの公開インターフェース制御。
 */

import { BUILD_INFO } from '../core/build-info.js';

/**
 * `debug=1` パラメータが付与された場合のみデバッグインターフェースを公開する。
 * @param {Function} reinit - 再初期化関数
 */
export async function exposeDebugInterfaceIfRequested(reinit) {
  if (!window.location.search.includes('debug=1')) {
    return;
  }

  const [
    core,
    ui,
    scanner,
    dataLifecycle,
    dataIntegrity,
    dataCleanup,
    dataBackup,
    dataStatistics,
    historyCommands,
    historyQueries,
    historyPersistence,
    historyExporters,
    historyImporters,
    historyStatistics,
    historyInit,
    dataFormats,
    dataStorage,
  ] = await Promise.all([
    import('../core/app-core.js'),
    import('../ui/app-ui.js'),
    import('../scanner/controller.js'),
    import('../data/lifecycle.js'),
    import('../data/integrity.js'),
    import('../data/cleanup.js'),
    import('../data/backup.js'),
    import('../data/statistics.js'),
    import('../data/history/commands.js'),
    import('../data/history/queries.js'),
    import('../data/history/persistence.js'),
    import('../data/history/exporters.js'),
    import('../data/history/importers.js'),
    import('../data/history/statistics.js'),
    import('../data/history/init.js'),
    import('../data/formats/catalog.js'),
    import('../data/storage.js'),
  ]);

  const historyApi = {
    add: historyCommands.addHistoryEntry,
    remove: historyCommands.removeHistoryEntry,
    clear: historyCommands.clearHistoryEntries,
    get: historyQueries.getHistory,
    getById: historyQueries.getHistoryById,
    count: historyQueries.getHistoryCount,
    save: historyPersistence.saveHistory,
    load: historyPersistence.loadHistory,
    exportAsJson: historyExporters.exportHistoryAsJson,
    exportAsCsv: historyExporters.exportHistoryAsCsv,
    exportAsText: historyExporters.exportHistoryAsText,
    importFromJson: historyImporters.importHistoryFromJson,
    getStatistics: historyStatistics.getHistoryStatistics,
    init: historyInit.initHistory,
  };

  const data = {
    initData: dataLifecycle.initData,
    validateDataIntegrity: dataIntegrity.validateDataIntegrity,
    cleanupData: dataCleanup.cleanupData,
    createBackup: dataBackup.createBackup,
    restoreFromBackup: dataBackup.restoreFromBackup,
    getStatistics: dataStatistics.getStatistics,
    history: historyApi,
    formats: dataFormats.default ?? dataFormats,
    storage: dataStorage.default ?? dataStorage,
  };

  window.ScanForge = {
    version: BUILD_INFO.version,
    modules: {
      core,
      ui,
      data,
      scanner,
    },
    reinit,
  };
}
