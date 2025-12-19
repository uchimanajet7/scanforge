/**
 * タブ幅制御
 */

import { on } from '../core/dom/events.js';

export default function createTabSizing(context) {
  const { elements } = context;

  let uniformTabWidthValue = null;
  let uniformTabWidthRafId = null;
  let tabWidthObserver = null;
  let tabWidthResizeCleanup = null;
  let tabWidthFontsHandler = null;
  let initialized = false;

  function init() {
    if (!elements.tabList || !elements.tabs || elements.tabs.length === 0) {
      return;
    }

    scheduleUpdate();

    if (initialized) {
      return;
    }
    initialized = true;

    if ('ResizeObserver' in window && !tabWidthObserver) {
      tabWidthObserver = new ResizeObserver(() => {
        scheduleUpdate();
      });
      tabWidthObserver.observe(elements.tabList);
    } else if (!tabWidthResizeCleanup) {
      tabWidthResizeCleanup = on(window, 'resize', () => {
        scheduleUpdate();
      });
    }

    if (document?.fonts && typeof document.fonts.addEventListener === 'function' && !tabWidthFontsHandler) {
      tabWidthFontsHandler = () => {
        scheduleUpdate();
      };
      document.fonts.addEventListener('loadingdone', tabWidthFontsHandler);
      document.fonts.addEventListener('loadingerror', tabWidthFontsHandler);
    }
  }

  function destroy() {
    if (tabWidthObserver) {
      tabWidthObserver.disconnect();
      tabWidthObserver = null;
    }
    if (tabWidthResizeCleanup) {
      tabWidthResizeCleanup();
      tabWidthResizeCleanup = null;
    }
    if (tabWidthFontsHandler && document?.fonts && typeof document.fonts.removeEventListener === 'function') {
      document.fonts.removeEventListener('loadingdone', tabWidthFontsHandler);
      document.fonts.removeEventListener('loadingerror', tabWidthFontsHandler);
    }
    tabWidthFontsHandler = null;

    if (uniformTabWidthRafId !== null) {
      window.cancelAnimationFrame(uniformTabWidthRafId);
      uniformTabWidthRafId = null;
    }

    if (elements.tabList) {
      elements.tabList.style.removeProperty('--tab-uniform-width');
    }
  }

  function scheduleUpdate() {
    if (uniformTabWidthRafId !== null) {
      window.cancelAnimationFrame(uniformTabWidthRafId);
    }
    uniformTabWidthRafId = window.requestAnimationFrame(() => {
      uniformTabWidthRafId = null;
      updateUniformWidth();
    });
  }

  function updateUniformWidth() {
    if (!elements.tabList || !elements.tabs || elements.tabs.length === 0) {
      uniformTabWidthValue = null;
      return;
    }

    const tabList = elements.tabList;
    const tabs = Array.from(elements.tabs);
    tabList.style.removeProperty('--tab-uniform-width');

    let maxWidth = 0;

    for (const tab of tabs) {
      const rect = tab.getBoundingClientRect();
      if (rect && Number.isFinite(rect.width) && rect.width > maxWidth) {
        maxWidth = rect.width;
      }
    }

    if (!Number.isFinite(maxWidth) || maxWidth <= 0) {
      uniformTabWidthValue = null;
      return;
    }

    const normalizedWidth = Math.round(maxWidth * 100) / 100;
    uniformTabWidthValue = normalizedWidth;
    tabList.style.setProperty('--tab-uniform-width', `${normalizedWidth}px`);
  }

  return {
    init,
    destroy,
    scheduleUpdate,
    getUniformWidth: () => uniformTabWidthValue,
  };
}
