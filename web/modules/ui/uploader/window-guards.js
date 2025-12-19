const listenerOptions = { passive: false };
let activeGuardCount = 0;

function guardWindowDrop(event) {
  if (!event?.dataTransfer) {
    return;
  }
  const types = Array.from(event.dataTransfer.types || []);
  if (!types.includes('Files')) {
    return;
  }
  event.preventDefault();
  if (event.type === 'drop') {
    event.dataTransfer.dropEffect = 'none';
  }
}

export function attachWindowGuards() {
  if (typeof window === 'undefined') {
    return () => {};
  }

  activeGuardCount += 1;
  if (activeGuardCount === 1) {
    window.addEventListener('dragover', guardWindowDrop, listenerOptions);
    window.addEventListener('drop', guardWindowDrop, listenerOptions);
  }

  let detached = false;
  return () => {
    if (detached || typeof window === 'undefined') {
      return;
    }
    detached = true;
    activeGuardCount = Math.max(0, activeGuardCount - 1);
    if (activeGuardCount === 0) {
      window.removeEventListener('dragover', guardWindowDrop, listenerOptions);
      window.removeEventListener('drop', guardWindowDrop, listenerOptions);
    }
  };
}
