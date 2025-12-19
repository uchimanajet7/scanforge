/**
 * タブナビゲーション制御。
 */

import { addClass, removeClass, show, hide } from '../core/dom/mutation.js';

export function createNavigation({
  elements,
  appState,
  logger,
  config,
  controllerState,
  getSizingControl,
}) {
  function getRouteFromHash() {
    const hash = window.location.hash.slice(1);
    if (!hash || hash === '') {
      return config.defaultTab;
    }
    return hash;
  }

  function updateHash(route) {
    const newHash = `#${route}`;
    if (window.location.hash !== newHash) {
      window.history.replaceState(null, '', newHash);
    }
  }

  function activateTab(route) {
    if (!elements.tabs || !elements.panels) {
      return;
    }

    Array.from(elements.tabs).forEach(tab => {
      const isActive = tab.dataset.route === route;
      tab.setAttribute('aria-selected', isActive);
      tab.tabIndex = isActive ? 0 : -1;
      if (isActive) {
        addClass(tab, 'is-active');
      } else {
        removeClass(tab, 'is-active');
      }
    });

    Array.from(elements.panels || []).forEach(panel => {
      const isActive = panel.dataset.route === route;
      if (isActive) {
        show(panel);
        panel.removeAttribute('aria-hidden');
      } else {
        hide(panel);
        panel.setAttribute('aria-hidden', 'true');
      }
    });

    document.documentElement.dataset.route = route;

    const activeTab = Array.from(elements.tabs || []).find(tab => tab.dataset.route === route);
    if (activeTab && document.activeElement === document.body) {
      activeTab.focus();
    }

    getSizingControl()?.scheduleUpdate();
  }

  function navigateTo(route) {
    const validRoute = config.tabs.find(tab => tab.id === route);
    const targetRoute = validRoute ? route : config.defaultTab;

    if (!validRoute) {
      logger.warn('無効なルート', { route });
    }

    if (targetRoute === controllerState.currentTab) {
      return;
    }

    activateTab(targetRoute);
    updateHash(targetRoute);
    appState.setState('ui.currentRoute', targetRoute);
    logger.debug('tabs:change', { from: controllerState.currentTab, to: targetRoute });
    controllerState.currentTab = targetRoute;
  }

  return {
    activateTab,
    navigateTo,
    getRouteFromHash,
    updateHash,
  };
}
