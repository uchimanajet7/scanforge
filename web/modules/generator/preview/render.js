import { elements } from '../dom-cache.js';

function createEmptyPreviewIcon() {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 64 64');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('aria-hidden', 'true');

  const frame = document.createElementNS(ns, 'rect');
  frame.setAttribute('x', '6');
  frame.setAttribute('y', '6');
  frame.setAttribute('width', '52');
  frame.setAttribute('height', '52');
  frame.setAttribute('rx', '8');
  frame.setAttribute('ry', '8');
  frame.setAttribute('fill', 'none');
  frame.setAttribute('stroke', 'currentColor');
  frame.setAttribute('stroke-width', '3');
  frame.setAttribute('stroke-dasharray', '6 6');
  svg.appendChild(frame);

  const moduleSquares = [
    { x: 16, y: 18 },
    { x: 30, y: 18 },
    { x: 16, y: 32 },
    { x: 30, y: 32 },
  ];
  moduleSquares.forEach(({ x, y }) => {
    const rect = document.createElementNS(ns, 'rect');
    rect.setAttribute('x', String(x));
    rect.setAttribute('y', String(y));
    rect.setAttribute('width', '10');
    rect.setAttribute('height', '10');
    rect.setAttribute('rx', '2');
    rect.setAttribute('ry', '2');
    rect.setAttribute('fill', 'currentColor');
    svg.appendChild(rect);
  });

  const baseLine = document.createElementNS(ns, 'rect');
  baseLine.setAttribute('x', '16');
  baseLine.setAttribute('y', '46');
  baseLine.setAttribute('width', '24');
  baseLine.setAttribute('height', '4');
  baseLine.setAttribute('rx', '2');
  baseLine.setAttribute('fill', 'currentColor');
  svg.appendChild(baseLine);

  const badge = document.createElementNS(ns, 'g');
  badge.setAttribute('class', 'preview-empty-badge');

  const badgeCircle = document.createElementNS(ns, 'circle');
  badgeCircle.setAttribute('cx', '46');
  badgeCircle.setAttribute('cy', '18');
  badgeCircle.setAttribute('r', '10');
  badge.appendChild(badgeCircle);

  const badgeVertical = document.createElementNS(ns, 'rect');
  badgeVertical.setAttribute('x', '45');
  badgeVertical.setAttribute('y', '12.5');
  badgeVertical.setAttribute('width', '2');
  badgeVertical.setAttribute('height', '11');
  badgeVertical.setAttribute('rx', '1');
  badge.appendChild(badgeVertical);

  const badgeHorizontal = document.createElementNS(ns, 'rect');
  badgeHorizontal.setAttribute('x', '40.5');
  badgeHorizontal.setAttribute('y', '17');
  badgeHorizontal.setAttribute('width', '11');
  badgeHorizontal.setAttribute('height', '2');
  badgeHorizontal.setAttribute('rx', '1');
  badge.appendChild(badgeHorizontal);

  svg.appendChild(badge);

  return svg;
}

function buildEmptyPreviewContent() {
  const wrapper = document.createElement('div');
  wrapper.className = 'preview-empty';

  const srMessage = document.createElement('span');
  srMessage.className = 'sr-only';
  srMessage.textContent = '生成結果はまだありません。バーコードを生成してください。';
  wrapper.appendChild(srMessage);

  const icon = document.createElement('span');
  icon.className = 'preview-empty-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.appendChild(createEmptyPreviewIcon());
  wrapper.appendChild(icon);

  const message = document.createElement('p');
  message.className = 'preview-empty-message';
  message.textContent = 'バーコードを生成するとここに表示されます。';
  wrapper.appendChild(message);

  return wrapper;
}

export function renderPreviewCanvas(canvas) {
  if (!elements.previewContainer) {
    return;
  }
  const wrapper = document.createElement('div');
  wrapper.dataset.previewKind = 'canvas';
  wrapper.appendChild(canvas);
  elements.previewContainer.replaceChildren(wrapper);
  elements.previewContainer.dataset.state = 'ready';
}

export function renderEmptyPreview() {
  if (!elements.previewContainer) {
    return;
  }
  const emptyContent = buildEmptyPreviewContent();
  elements.previewContainer.replaceChildren(emptyContent);
  elements.previewContainer.dataset.state = 'empty';
}

export function clearPreview() {
  renderEmptyPreview();
}
