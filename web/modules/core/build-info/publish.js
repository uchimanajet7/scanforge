/**
 * ビルド情報を公開するユーティリティ。
 */

import { formatBuildLabel } from './format.js';

export function publishBuildInfo(info, logger = console) {
  const safeLogger = logger && typeof logger.warn === 'function' ? logger : console;
  const label = formatBuildLabel(info);

  try {
    if (typeof window !== 'undefined') {
      window.SCANFORGE_BUILD_INFO = info;
    }
  } catch (error) {
    safeLogger.warn('build:publish-window-failed', { error });
  }

  if (typeof document === 'undefined') {
    return info;
  }

  const root = document.documentElement;
  if (root?.dataset) {
    root.dataset.build = label;
    root.dataset.buildLabel = label;
    root.dataset.buildVersion = info.version || '';
    root.dataset.buildHash = info.hash || '';
    root.dataset.buildTimestamp = info.timestamp || '';
    root.dataset.buildEnvironment = info.environment || '';
  }

  const applyFooterLabel = () => {
    try {
      const footerMeta = document.getElementById('footerMeta');
      if (!footerMeta) {
        safeLogger.debug?.('build:footer-missing');
        return;
      }

      footerMeta.textContent = `© ScanForge (${label})`;
      footerMeta.dataset.buildVersion = info.version || '';

      if (info?.timestamp) {
        const date = new Date(info.timestamp);
        const formatted = date.toLocaleString('ja-JP', {
          timeZone: 'Asia/Tokyo',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });
        footerMeta.title = `${formatted} JST`;
        footerMeta.dataset.buildTimestamp = info.timestamp;
      } else {
        footerMeta.removeAttribute('title');
        delete footerMeta.dataset.buildTimestamp;
      }

      footerMeta.dataset.buildHash = info.hash || '';
      footerMeta.dataset.buildLabel = label;
      footerMeta.dataset.buildEnvironment = info.environment || '';
    } catch (error) {
      safeLogger.warn('build:footer-apply-failed', { error });
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyFooterLabel, { once: true });
  } else {
    applyFooterLabel();
  }

  return info;
}
