import { getJobActions } from './actions.js';

export function buildActions(job, document) {
  const actionsContainer = document.createElement('div');
  actionsContainer.className = 'scan-import-job-actions';
  const actions = getJobActions(job);

  actions.forEach(action => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `scan-import-job-action scan-import-job-action--${action.variant}`;
    button.textContent = action.label;
    button.setAttribute('data-job-action', action.action);
    button.setAttribute('data-job-id', job.id);
    button.setAttribute(
      'aria-label',
      `${job.fileName || 'このファイル'}を${action.ariaLabel ?? action.label}`,
    );
    actionsContainer.appendChild(button);
  });

  return actionsContainer;
}
