/**
 * フォーマット関連定数とユーティリティ。
 */
export const SCALE_GUIDE_BASE = Object.freeze({
  matrix: {
    unitLabel: 'モジュール',
    description: '2D コードの最小セルの大きさを指定します。',
    quietZoneModules: 4,
    minQuietZonePx: 12,
  },
  stacked: {
    unitLabel: 'セル',
    description: 'スタック型バーコードの最小セル幅を指定します。',
    quietZoneModules: 2,
    minQuietZonePx: 12,
  },
  linear: {
    unitLabel: 'バー幅',
    description: '線形バーコードの最小バー幅を指定します。',
    quietZoneModules: 10,
    minQuietZonePx: 16,
  },
});

export const FORMAT_SCALE_SETTINGS = Object.freeze({
  qrcode: { type: 'matrix', quietZoneModules: 4 },
  datamatrix: { type: 'matrix', quietZoneModules: 1, minQuietZonePx: 0 },
  pdf417: { type: 'stacked', quietZoneModules: 2 },
  code128: { type: 'linear', quietZoneModules: 10, minQuietZonePx: 20 },
  ean13: { type: 'linear', quietZoneModules: 11, minQuietZonePx: 22 },
  upca: { type: 'linear', quietZoneModules: 9, minQuietZonePx: 22 },
  itf14: { type: 'linear', quietZoneModules: 10, minQuietZonePx: 22 },
});

export const FORMAT_DISPLAY_NAMES = Object.freeze({
  qr_code: 'QR Code',
  code_128: 'Code 128',
  code_39: 'Code 39',
  ean_13: 'EAN-13',
  ean_8: 'EAN-8',
  upc_a: 'UPC-A',
  upc_e: 'UPC-E',
  data_matrix: 'Data Matrix',
  pdf417: 'PDF417',
  aztec: 'Aztec',
  codabar: 'Codabar',
  itf: 'ITF',
  maxi_code: 'MaxiCode',
});

export function resolveFormatGuide(format) {
  const key = String(format || '').toLowerCase();
  const overrides = FORMAT_SCALE_SETTINGS[key] || {};
  const type = overrides.type || 'matrix';
  const base = SCALE_GUIDE_BASE[type] || SCALE_GUIDE_BASE.matrix;

  return {
    type,
    unitLabel: overrides.unitLabel || base.unitLabel,
    description: overrides.description || base.description,
    quietZoneModules: overrides.quietZoneModules ?? base.quietZoneModules,
    minQuietZonePx: overrides.minQuietZonePx ?? base.minQuietZonePx ?? 12,
  };
}

export function formatDisplayName(format) {
  if (!format) return 'Unknown';
  const normalized = String(format).toLowerCase();

  if (FORMAT_DISPLAY_NAMES[normalized]) {
    return FORMAT_DISPLAY_NAMES[normalized];
  }

  return normalized
    .split(/[_\-\s]+/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function resolveQuietZoneModules(format, scale) {
  const guide = resolveFormatGuide(format);
  const unitScale = Math.max(1, Math.round(Number(scale) || 1));
  const minByPixels = Math.ceil((guide.minQuietZonePx || 0) / unitScale);
  const recommended = guide.quietZoneModules || 0;
  return Math.max(recommended, minByPixels || 0);
}
