/**
 * タブナビゲーション管理。
 */

import { logger } from '../../core/logger.js';
import appState from '../../core/state/app-state.js';
import { on } from '../core/dom/events.js';
import { enable, disable } from '../core/dom/mutation.js';
import createTabSizing from './sizing.js';
import { assignTabElements } from './query.js';
import { createNavigation } from './navigation.js';
import { bindTabEvents } from './events.js';

const TAB_CONFIG = {
  tabs: [
    { id: 'scan', label: 'スキャン', icon: 'camera' },
    { id: 'generate', label: '生成', icon: 'barcode' },
  ],
  defaultTab: 'scan',
};

const elements = {
  tabList: null,
  tabs: null,
  panels: null,
};

const controllerState = {
  currentTab: null,
  cleanupListeners: [],
  stateUnsubscribe: null,
  sizingControl: null,
};

let navigationApi = null;

function registerCleanup(fn) {
  if (typeof fn === 'function') {
    controllerState.cleanupListeners.push(fn);
  }
}

function runCleanup() {
  const listeners = controllerState.cleanupListeners.splice(0);
  listeners.forEach(off => {
    try {
      off();
    } catch (error) {
      logger.debug('tabs:cleanup:error', { error });
    }
  });
}

function resetState() {
  runCleanup();

  if (typeof controllerState.stateUnsubscribe === 'function') {
    controllerState.stateUnsubscribe();
    controllerState.stateUnsubscribe = null;
  }

  controllerState.sizingControl?.destroy?.();
  controllerState.sizingControl = null;
  controllerState.currentTab = null;
  navigationApi = null;
}

export function init() {
  resetState();

  assignTabElements(elements);

  if (!elements.tabList || !elements.tabs || elements.tabs.length === 0) {
    logger.warn('タブ要素が見つかりません');
    return;
  }

  controllerState.sizingControl = createTabSizing({ elements });

  navigationApi = createNavigation({
    elements,
    appState,
    logger,
    config: TAB_CONFIG,
    controllerState,
    getSizingControl: () => controllerState.sizingControl,
  });

  bindTabEvents({
    elements,
    navigateTo: navigationApi.navigateTo,
    registerCleanup,
  });

  const initialRoute = window.__SCANFORGE_INITIAL_ROUTE__ || navigationApi.getRouteFromHash();
  logger.debug('tabs:init', {
    hash: window.location.hash,
    __SCANFORGE_INITIAL_ROUTE__: window.__SCANFORGE_INITIAL_ROUTE__,
    initialRoute,
  });

  navigationApi.navigateTo(initialRoute);

  registerCleanup(on(window, 'hashchange', () => {
    const route = navigationApi.getRouteFromHash();
    if (route !== controllerState.currentTab) {
      navigationApi.navigateTo(route);
    }
  }));

  controllerState.stateUnsubscribe = appState.subscribe('ui.currentRoute', (route) => {
    navigationApi.activateTab(route);
  });

  logger.debug('tabs:init:complete');
}

export function navigateTo(route) {
  navigationApi?.navigateTo(route);
}

export function getCurrentTab() {
  return controllerState.currentTab || TAB_CONFIG.defaultTab;
}

export function hasTab(tabId) {
  return TAB_CONFIG.tabs.some(tab => tab.id === tabId);
}

export function getAllTabs() {
  return [...TAB_CONFIG.tabs];
}

export function nextTab() {
  if (!navigationApi) {
    return;
  }
  const tabs = TAB_CONFIG.tabs;
  const currentIndex = tabs.findIndex(tab => tab.id === getCurrentTab());
  const nextIndex = (currentIndex + 1) % tabs.length;
  navigationApi.navigateTo(tabs[nextIndex].id);
}

export function previousTab() {
  if (!navigationApi) {
    return;
  }
  const tabs = TAB_CONFIG.tabs;
  const currentIndex = tabs.findIndex(tab => tab.id === getCurrentTab());
  const prevIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
  navigationApi.navigateTo(tabs[prevIndex].id);
}

export function enableTab(tabId) {
  const tab = Array.from(elements.tabs || []).find(t => t.dataset.route === tabId);
  if (tab) {
    enable(tab);
    logger.debug('タブ有効化', { tabId });
  }
}

export function disableTab(tabId) {
  const tab = Array.from(elements.tabs || []).find(t => t.dataset.route === tabId);
  if (tab) {
    disable(tab);
    logger.debug('タブ無効化', { tabId });
  }
}

export function destroy() {
  resetState();
}
