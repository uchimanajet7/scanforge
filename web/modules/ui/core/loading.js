/**
 * ローディング表示制御
 */

import { logger } from '../../core/logger.js';
import { get } from './dom/query.js';
import { show, removeClass } from './dom/mutation.js';
import { fadeOut } from './dom/animation.js';

export function showLoading() {
  const loader = get('#appLoading');
  if (!loader) return;
  show(loader);
  loader.setAttribute('aria-busy', 'true');
  logger.debug('ui:loading:show');
}

export async function hideLoading() {
  const loader = get('#appLoading');
  if (loader) {
    await fadeOut(loader, 200);
    loader.remove();
  }

  const app = get('.app');
  if (app) {
    removeClass(app, 'is-loading');
    app.setAttribute('aria-busy', 'false');
  }

  logger.debug('ui:loading:hide');
}

export default {
  showLoading,
  hideLoading,
};
