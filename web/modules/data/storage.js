import {
  set,
  get,
  remove,
  has,
  clear,
} from './storage/operations.js';
import { getStorageSize } from './storage/metrics.js';
import { migrateStorage } from './storage/migrations.js';
import {
  exportStorageData,
  importStorageData,
} from './storage/transfer.js';
import { initStorage } from './storage/init.js';

export {
  set,
  get,
  remove,
  has,
  clear,
  getStorageSize as getSize,
  migrateStorage as migrate,
  exportStorageData as exportData,
  importStorageData as importData,
  initStorage as init,
};

export default {
  set,
  get,
  remove,
  has,
  clear,
  getSize: getStorageSize,
  migrate: migrateStorage,
  exportData: exportStorageData,
  importData: importStorageData,
  init: initStorage,
};
