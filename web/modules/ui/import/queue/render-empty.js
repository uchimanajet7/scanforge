export function buildEmptyMessage(document) {
  const paragraph = document.createElement('p');
  paragraph.className = 'scan-import-queue-empty';
  paragraph.textContent = '待機中のファイルはありません。';
  return paragraph;
}
