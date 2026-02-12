/**
 * フォーマット定義とレジストリ。
 */

import { logger } from '../../core/logger.js';

export const SUPPORTED_FORMATS = {
  qr_code: {
    name: 'QR Code',
    type: '2d',
    category: 'matrix',
    barcodeDetector: 'qr_code',
    zxing: 'QR_CODE',
    bwip: 'qrcode',
    description: 'QRコード',
    maxLength: 4296,
    errorCorrection: ['L', 'M', 'Q', 'H'],
  },
  data_matrix: {
    name: 'Data Matrix',
    type: '2d',
    category: 'matrix',
    barcodeDetector: 'data_matrix',
    zxing: 'DATA_MATRIX',
    bwip: 'datamatrix',
    description: 'データマトリックス',
    maxLength: 3116,
  },
  aztec: {
    name: 'Aztec',
    type: '2d',
    category: 'matrix',
    barcodeDetector: 'aztec',
    zxing: 'AZTEC',
    bwip: 'azteccode',
    description: 'アステカコード',
    maxLength: 3832,
  },
  pdf417: {
    name: 'PDF417',
    type: '2d',
    category: 'stacked',
    barcodeDetector: 'pdf417',
    zxing: 'PDF_417',
    bwip: 'pdf417',
    description: 'PDF417',
    maxLength: 1850,
  },
  code_128: {
    name: 'Code 128',
    type: '1d',
    category: 'linear',
    barcodeDetector: 'code_128',
    zxing: 'CODE_128',
    bwip: 'code128',
    description: 'Code 128',
    maxLength: 80,
    charset: 'ASCII',
  },
  code_39: {
    name: 'Code 39',
    type: '1d',
    category: 'linear',
    barcodeDetector: 'code_39',
    zxing: 'CODE_39',
    bwip: 'code39',
    description: 'Code 39',
    maxLength: 80,
    charset: 'ALPHANUMERIC',
  },
  code_93: {
    name: 'Code 93',
    type: '1d',
    category: 'linear',
    barcodeDetector: 'code_93',
    zxing: 'CODE_93',
    bwip: 'code93',
    description: 'Code 93',
    maxLength: 80,
    charset: 'ALPHANUMERIC',
  },
  ean_13: {
    name: 'EAN-13',
    type: '1d',
    category: 'linear',
    barcodeDetector: 'ean_13',
    zxing: 'EAN_13',
    bwip: 'ean13',
    description: 'EAN-13 は European Article Number の 13 桁シンボルで、日本では Japanese Article Number と呼ばれる。',
    fixedLength: 13,
    charset: 'NUMERIC',
  },
  ean_8: {
    name: 'EAN-8',
    type: '1d',
    category: 'linear',
    barcodeDetector: 'ean_8',
    zxing: 'EAN_8',
    bwip: 'ean8',
    description: 'EAN-8',
    fixedLength: 8,
    charset: 'NUMERIC',
  },
  upc_a: {
    name: 'UPC-A',
    type: '1d',
    category: 'linear',
    barcodeDetector: 'upc_a',
    zxing: 'UPC_A',
    bwip: 'upca',
    description: 'UPC-A',
    fixedLength: 12,
    charset: 'NUMERIC',
  },
  upc_e: {
    name: 'UPC-E',
    type: '1d',
    category: 'linear',
    barcodeDetector: 'upc_e',
    zxing: 'UPC_E',
    bwip: 'upce',
    description: 'UPC-E',
    fixedLength: 8,
    charset: 'NUMERIC',
  },
  itf: {
    name: 'ITF',
    type: '1d',
    category: 'linear',
    barcodeDetector: 'itf',
    zxing: 'ITF',
    bwip: 'interleaved2of5',
    description: 'ITF。Interleaved 2 of 5 を表す。',
    evenLength: true,
    charset: 'NUMERIC',
  },
  codabar: {
    name: 'Codabar',
    type: '1d',
    category: 'linear',
    barcodeDetector: 'codabar',
    zxing: 'CODABAR',
    bwip: 'codabar',
    description: 'Codabar。NW-7 と呼ばれる。',
    maxLength: 80,
    charset: 'NUMERIC_SPECIAL',
  },
};

export function getAllFormats() {
  return Object.keys(SUPPORTED_FORMATS);
}

export function getFormatsByType(type) {
  return Object.entries(SUPPORTED_FORMATS)
    .filter(([_, def]) => def.type === type)
    .map(([key]) => key);
}

export function getFormatsByCategory(category) {
  return Object.entries(SUPPORTED_FORMATS)
    .filter(([_, def]) => def.category === category)
    .map(([key]) => key);
}

export function isSupported(format) {
  return format in SUPPORTED_FORMATS;
}

export function init() {
  const formats = getAllFormats();
  logger.debug('formats:supported', {
    total: formats.length,
    '1d': getFormatsByType('1d').length,
    '2d': getFormatsByType('2d').length,
  });
}
