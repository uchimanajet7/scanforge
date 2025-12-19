/**
 * SVG ロゴのサニタイズ処理。
 */

export function sanitizeSvgText(input) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(input, 'image/svg+xml');
  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    throw new Error('svg-parse-failed');
  }
  const root = doc.documentElement;
  if (!root.getAttribute('xmlns')) {
    root.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  }
  const disallowed = ['script', 'foreignObject', 'iframe', 'audio', 'video', 'style', 'metadata'].join(',');
  doc.querySelectorAll(disallowed).forEach(node => node.remove());
  doc.querySelectorAll('*').forEach(node => {
    stripDisallowedSvgAttributes(node);
  });
  const serializer = new XMLSerializer();
  return serializer.serializeToString(root);
}

export function stripDisallowedSvgAttributes(element) {
  const attributes = Array.from(element.attributes);
  attributes.forEach(attr => {
    const name = attr.name.toLowerCase();
    const value = attr.value.trim();
    if (name.startsWith('on')) {
      element.removeAttribute(attr.name);
      return;
    }
    if (name === 'href' || name === 'xlink:href') {
      if (value && !value.startsWith('data:') && !value.startsWith('#')) {
        element.removeAttribute(attr.name);
      }
      return;
    }
    if (name === 'style' && /\b(url|expression|import)\s*\(/i.test(value)) {
      element.removeAttribute(attr.name);
    }
  });
}
