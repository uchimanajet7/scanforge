/**
 * フォーマット入力検証。
 */

import { SUPPORTED_FORMATS } from './definitions.js';

export function validateText(text, format) {
  const def = SUPPORTED_FORMATS[format];

  if (!def) {
    return {
      valid: false,
      error: `不明なフォーマット: ${format}`,
    };
  }

  if (def.fixedLength && text.length !== def.fixedLength) {
    return {
      valid: false,
      error: `${def.fixedLength}文字である必要があります`,
    };
  }

  if (def.maxLength && text.length > def.maxLength) {
    return {
      valid: false,
      error: `最大${def.maxLength}文字まで`,
    };
  }

  if (def.evenLength && text.length % 2 !== 0) {
    return {
      valid: false,
      error: '偶数桁である必要があります',
    };
  }

  if (def.charset) {
    let pattern;
    switch (def.charset) {
      case 'NUMERIC':
        pattern = /^[0-9]+$/;
        break;
      case 'ALPHANUMERIC':
        pattern = /^[A-Z0-9]+$/;
        break;
      case 'NUMERIC_SPECIAL':
        pattern = /^[0-9\-\$\:\.\+\/]+$/;
        break;
      case 'ASCII':
        pattern = /^[\x00-\x7F]+$/;
        break;
      default:
        pattern = null;
        break;
    }

    if (pattern && !pattern.test(text)) {
      return {
        valid: false,
        error: `使用できない文字が含まれています（${def.charset}のみ）`,
      };
    }
  }

  if (['ean_13', 'ean_8', 'upc_a', 'upc_e'].includes(format)) {
    if (!/^\d+$/.test(text)) {
      return {
        valid: false,
        error: '数字のみ使用できます',
      };
    }

    const checkDigit = calculateCheckDigit(text.slice(0, -1), format);
    if (text[text.length - 1] !== checkDigit) {
      return {
        valid: false,
        error: 'チェックディジットが不正です',
        suggestion: text.slice(0, -1) + checkDigit,
      };
    }
  }

  return {
    valid: true,
  };
}

function calculateCheckDigit(text, format) {
  if (['ean_13', 'ean_8', 'upc_a', 'upc_e'].includes(format)) {
    let sum = 0;
    for (let i = 0; i < text.length; i += 1) {
      const digit = Number.parseInt(text[i], 10);
      sum += digit * (i % 2 === 0 ? 1 : 3);
    }
    return String((10 - (sum % 10)) % 10);
  }

  return '';
}
