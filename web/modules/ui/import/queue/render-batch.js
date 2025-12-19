export function buildBatchHeader(meta, batchIndex, document) {
  const header = document.createElement('div');
  header.className = 'scan-import-batch-header';
  header.setAttribute('role', 'presentation');
  header.dataset.batchKey = meta?.key ?? '';

  if (meta?.id) {
    header.dataset.batchId = meta.id;
  }
  if (typeof batchIndex === 'number') {
    header.dataset.batchIndex = String(batchIndex);
    if (batchIndex % 2 === 1) {
      header.classList.add('is-alt');
    }
  }

  const title = document.createElement('span');
  title.className = 'scan-import-batch-time';
  title.setAttribute('role', 'heading');
  title.setAttribute('aria-level', '6');
  title.textContent = `${meta?.label || '時刻不明'} に追加`;

  const count = document.createElement('span');
  count.className = 'scan-import-batch-count';
  count.textContent = `${meta?.count ?? 0} 件`;

  header.appendChild(title);
  header.appendChild(count);

  if (meta?.firstFileName) {
    header.title = meta.count > 1
      ? `${meta.firstFileName} など`
      : meta.firstFileName;
  }

  return header;
}
