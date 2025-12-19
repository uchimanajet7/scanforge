import {
  formatBytes,
  formatJobDetail,
  formatJobStatusLabel,
  truncate,
} from './formatters.js';
import { buildActions } from './render-actions.js';

function buildThumbnail(job, document) {
  const thumb = document.createElement('div');
  thumb.className = 'scan-import-job-thumb';

  if (job.objectUrl) {
    const img = document.createElement('img');
    img.src = job.objectUrl;
    img.alt = `${job.fileName || '画像'} のプレビュー`;
    thumb.appendChild(img);
  } else {
    const placeholder = document.createElement('span');
    placeholder.className = 'scan-import-job-thumb-fallback';
    placeholder.textContent = job.mime ? job.mime.split('/')[0].toUpperCase() : 'IMG';
    thumb.appendChild(placeholder);
  }

  return thumb;
}

function buildProgress(job, document) {
  const progress = document.createElement('div');
  progress.className = 'scan-import-job-progress';
  const progressValue = document.createElement('span');
  progress.appendChild(progressValue);

  if (job.progress?.mode === 'determinate' && typeof job.progress.value === 'number') {
    const ratio = Math.min(Math.max(job.progress.value, 0), 1);
    progress.dataset.mode = 'determinate';
    progressValue.style.width = `${(ratio * 100).toFixed(2)}%`;
  } else if (['preparing', 'scanning', 'retrying'].includes(job.status)) {
    progress.dataset.mode = 'indeterminate';
  } else {
    progress.dataset.mode = 'idle';
    progressValue.style.width = '0%';
  }

  return progress;
}

export function buildJobElement(job, options) {
  const {
    batchIndex,
    formats,
    document,
  } = options;

  const item = document.createElement('article');
  item.className = 'scan-import-job';
  item.dataset.status = job.status || 'queued';
  item.setAttribute('role', 'listitem');

  if (job.batchId) {
    item.dataset.batchId = job.batchId;
  }
  if (typeof batchIndex === 'number') {
    item.dataset.batchIndex = String(batchIndex);
    if (batchIndex % 2 === 1) {
      item.classList.add('is-alt');
    }
  }

  item.appendChild(buildThumbnail(job, document));

  const body = document.createElement('div');
  body.className = 'scan-import-job-body';

  const header = document.createElement('div');
  header.className = 'scan-import-job-header';

  const fileName = document.createElement('h3');
  fileName.className = 'scan-import-job-name';
  fileName.textContent = job.fileName || '名称不明のファイル';
  header.appendChild(fileName);

  const size = document.createElement('span');
  size.className = 'scan-import-job-size';
  size.textContent = formatBytes(job.fileSize || 0);
  header.appendChild(size);

  const statusLine = document.createElement('div');
  statusLine.className = 'scan-import-job-status';
  statusLine.textContent = formatJobStatusLabel(job);

  const detail = document.createElement('div');
  detail.className = 'scan-import-job-detail';
  detail.textContent = formatJobDetail(job, formats, text => truncate(text, 48));

  const progress = buildProgress(job, document);

  body.appendChild(header);
  body.appendChild(statusLine);
  body.appendChild(detail);
  body.appendChild(progress);
  item.appendChild(body);

  item.appendChild(buildActions(job, document));

  return item;
}
