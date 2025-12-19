/**
 * スタイルシートのキャッシュバスティング処理。
 */

import { logger as defaultLogger } from '../logger.js';

function sanitizeHash(hash) {
  return (hash || '')
    .toString()
    .replace(/[^a-z0-9]/gi, '')
    .slice(0, 12);
}

export function resolveStylesheetVersion(info) {
  if (!info || info.environment === 'development') {
    return `dev-${Date.now()}`;
  }

  const sanitizedHash = sanitizeHash(info.hash);
  if (sanitizedHash && sanitizedHash !== 'unknown') {
    return sanitizedHash;
  }

  const timestampValue = Date.parse(info.timestamp || '');
  if (!Number.isNaN(timestampValue)) {
    const date = new Date(timestampValue);
    return [
      date.getUTCFullYear(),
      String(date.getUTCMonth() + 1).padStart(2, '0'),
      String(date.getUTCDate()).padStart(2, '0'),
      String(date.getUTCHours()).padStart(2, '0'),
    ].join('');
  }

  return `fallback-${Date.now()}`;
}

export function applyStylesheetCacheBust(info, { logger = defaultLogger } = {}) {
  if (typeof document === 'undefined') {
    return;
  }

  const version = resolveStylesheetVersion(info);
  const links = Array.from(document.querySelectorAll('link[data-cache-bust="stylesheet"]'));

  links.forEach((link) => {
    const href = link.getAttribute('href');
    if (!href) {
      return;
    }

    try {
      const url = new URL(href, window.location.href);
      if (url.searchParams.get('v') === version && link.dataset.cacheBustApplied === 'true') {
        return;
      }

      url.searchParams.set('v', version);
      const nextHref = url.toString();

      if (link.dataset.cacheBustApplied === 'true') {
        link.href = nextHref;
        return;
      }

      const clone = link.cloneNode(true);
      clone.href = nextHref;
      clone.dataset.cacheBustApplied = 'true';

      clone.addEventListener('load', () => {
        try {
          link.remove();
        } catch (error) {
          logger?.debug?.('cache-bust:remove-failed', { error });
        }
      });

      link.parentNode?.insertBefore(clone, link.nextSibling);
    } catch (error) {
      logger?.warn?.('cache-bust:apply-failed', { error, href });
    }
  });

  logger?.debug?.('cache-bust:applied', { version, linkCount: links.length });
}
