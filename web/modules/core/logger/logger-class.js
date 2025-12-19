/**
 * ロギングクラス本体。
 */

import { LOG_LEVELS } from '../config/log-levels.js';
import { STORAGE_KEYS } from '../config/storage-keys.js';
import { APP_CONFIG } from '../config/app-settings.js';

export class Logger {
  constructor(defaultLevel = APP_CONFIG.DEFAULT_LOG_LEVEL) {
    this.currentLevel = defaultLevel;
    this.prefix = '[ScanForge]';
    this.initialize();
  }

  initialize() {
    const storedLevel = this.readStoredLevel();
    const paramLevel = this.readParamLevel();
    const initialLevel = this.sanitizeLevel(paramLevel || storedLevel || this.currentLevel);
    this.setLevel(initialLevel, { persist: !paramLevel });
    this.exposeGlobal();
  }

  sanitizeLevel(level) {
    return LOG_LEVELS.includes(level) ? level : APP_CONFIG.DEFAULT_LOG_LEVEL;
  }

  shouldLog(level) {
    return LOG_LEVELS.indexOf(level) <= LOG_LEVELS.indexOf(this.currentLevel);
  }

  output(level, method, args) {
    if (!this.shouldLog(level)) return;

    const levelTag = `[${level}]`;

    try {
      if (args.length >= 2 && typeof args[1] === 'object') {
        const [message, data] = args;
        console[method](this.prefix, levelTag, message, data);
      } else {
        console[method](this.prefix, levelTag, ...args);
      }
    } catch (error) {
      console.log(this.prefix, levelTag, ...args);
    }
  }

  readStoredLevel() {
    try {
      return localStorage.getItem(STORAGE_KEYS.logLevel);
    } catch (error) {
      console.warn(this.prefix, '[warn]', 'ログレベルの読み込みに失敗', error);
      return null;
    }
  }

  readParamLevel() {
    try {
      const params = new URL(window.location.href).searchParams;
      const level = params.get('logLevel');
      return level ? this.sanitizeLevel(level) : null;
    } catch (error) {
      console.warn(this.prefix, '[warn]', 'クエリからのログレベル取得に失敗', error);
      return null;
    }
  }

  setLevel(level, { persist = true } = {}) {
    const sanitized = this.sanitizeLevel(level);
    this.currentLevel = sanitized;

    if (persist) {
      try {
        localStorage.setItem(STORAGE_KEYS.logLevel, sanitized);
      } catch (error) {
        console.warn(this.prefix, '[warn]', 'ログレベルの保存に失敗', error);
      }
    }

    this.info(`logLevel => ${sanitized}`);
  }

  getLevel() {
    return this.currentLevel;
  }

  exposeGlobal() {
    try {
      window.ScanForgeLogger = {
        error: this.error.bind(this),
        warn: this.warn.bind(this),
        info: this.info.bind(this),
        debug: this.debug.bind(this),
        setLevel: this.setLevel.bind(this),
        getLevel: this.getLevel.bind(this),
        levels: [...LOG_LEVELS],
      };
    } catch (error) {
      console.warn(this.prefix, '[warn]', 'ScanForgeLogger の公開に失敗', error);
    }
  }

  error(...args) {
    this.output('error', 'error', args);
  }

  warn(...args) {
    this.output('warn', 'warn', args);
  }

  info(...args) {
    this.output('info', 'info', args);
  }

  debug(...args) {
    this.output('debug', 'debug', args);
  }

  time(label) {
    if (!this.shouldLog('debug')) return;
    console.time(`${this.prefix} [debug] ${label}`);
  }

  timeEnd(label) {
    if (!this.shouldLog('debug')) return;
    console.timeEnd(`${this.prefix} [debug] ${label}`);
  }

  group(label) {
    if (!this.shouldLog('debug')) return;
    console.group(`${this.prefix} [debug] ${label}`);
  }

  groupEnd() {
    if (!this.shouldLog('debug')) return;
    console.groupEnd();
  }

  table(data) {
    if (!this.shouldLog('debug')) return;
    console.table(data);
  }
}
