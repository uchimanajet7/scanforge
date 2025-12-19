/**
 * タブイベントのバインド。
 */

import { on } from '../core/dom/events.js';

export function bindTabEvents({ elements, navigateTo, registerCleanup }) {
  if (!elements.tabList || !elements.tabs || elements.tabs.length === 0) {
    return;
  }

  const handleTabClick = (event) => {
    event.preventDefault();
    const tab = event.currentTarget;
    const route = tab.dataset.route;
    if (route) {
      navigateTo(route);
    }
  };

  const handleTabKeydown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleTabClick(event);
    }
  };

  const handleTabListKeydown = (event) => {
    const tabs = Array.from(elements.tabs);
    const currentIndex = tabs.findIndex(tab => tab === document.activeElement);

    let nextIndex = -1;

    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        nextIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'Home':
        event.preventDefault();
        nextIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        nextIndex = tabs.length - 1;
        break;
      default:
        break;
    }

    if (nextIndex >= 0) {
      tabs[nextIndex].focus();
    }
  };

  registerCleanup(on(elements.tabList, 'keydown', handleTabListKeydown));

  Array.from(elements.tabs).forEach(tab => {
    registerCleanup(on(tab, 'click', handleTabClick));
    registerCleanup(on(tab, 'keydown', handleTabKeydown));
  });
}
