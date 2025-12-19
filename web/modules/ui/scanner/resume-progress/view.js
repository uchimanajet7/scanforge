const DEFAULT_LABEL = 'スキャン自動再開の進行状況';

export function createResumeProgressView({ progressEl, labelEl } = {}) {
  const reduceMotionQuery = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;
  let reduceMotionListener = null;
  const defaultLabel = labelEl?.textContent || DEFAULT_LABEL;

  function showActive({ ratio, totalMs, elapsedMs, labelText }) {
    if (!progressEl) {
      return;
    }
    progressEl.classList.add('is-active');
    progressEl.setAttribute('aria-hidden', 'false');
    progressEl.setAttribute('aria-valuemin', '0');
    progressEl.setAttribute('aria-valuemax', String(totalMs));
    progressEl.setAttribute('aria-valuenow', String(Math.round(elapsedMs)));
    progressEl.setAttribute('aria-valuetext', labelText);
    progressEl.style.setProperty('--resume-progress', ratio.toString());
    if (labelEl) {
      labelEl.textContent = labelText;
    }
  }

  function hide({ complete = false } = {}) {
    if (!progressEl) {
      return;
    }
    if (complete) {
      progressEl.style.setProperty('--resume-progress', '1');
    } else {
      progressEl.style.removeProperty('--resume-progress');
    }
    progressEl.classList.remove('is-active');
    progressEl.setAttribute('aria-hidden', 'true');
    progressEl.removeAttribute('aria-valuenow');
    progressEl.removeAttribute('aria-valuetext');
    if (labelEl) {
      labelEl.textContent = defaultLabel;
    }
  }

  function prefersReducedMotion() {
    if (reduceMotionQuery) {
      return reduceMotionQuery.matches;
    }
    return document.documentElement.classList.contains('reduce-motion');
  }

  function observeReduceMotion(handler) {
    if (!reduceMotionQuery || typeof handler !== 'function') {
      return;
    }
    reduceMotionListener = handler;
    if (typeof reduceMotionQuery.addEventListener === 'function') {
      reduceMotionQuery.addEventListener('change', handler);
    } else if (typeof reduceMotionQuery.addListener === 'function') {
      reduceMotionQuery.addListener(handler);
    }
  }

  function disconnectReduceMotion() {
    if (!reduceMotionQuery || !reduceMotionListener) {
      return;
    }
    if (typeof reduceMotionQuery.removeEventListener === 'function') {
      reduceMotionQuery.removeEventListener('change', reduceMotionListener);
    } else if (typeof reduceMotionQuery.removeListener === 'function') {
      reduceMotionQuery.removeListener(reduceMotionListener);
    }
    reduceMotionListener = null;
  }

  return {
    showActive,
    hide,
    prefersReducedMotion,
    observeReduceMotion,
    disconnectReduceMotion,
  };
}
