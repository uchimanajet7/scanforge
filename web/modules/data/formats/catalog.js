/**
 * フォーマット関連機能のオーケストレーター。
 */

import {
  SUPPORTED_FORMATS,
  getAllFormats,
  getFormatsByType,
  getFormatsByCategory,
  isSupported,
  init as initFormats,
} from './definitions.js';
import {
  toBarcodeDetectorFormat,
  toZXingFormat,
  toBwipFormat,
  fromExternalFormat,
} from './conversions.js';
import {
  getDisplayName,
  getDescription,
  getType,
  getCategory,
  getRecommendedSettings,
} from './metadata.js';
import { validateText } from './validation.js';

export {
  SUPPORTED_FORMATS,
  toBarcodeDetectorFormat,
  toZXingFormat,
  toBwipFormat,
  fromExternalFormat,
  getDisplayName,
  getDescription,
  getType,
  getCategory,
  isSupported,
  getAllFormats,
  getFormatsByType,
  getFormatsByCategory,
  validateText,
  getRecommendedSettings,
  initFormats as init,
};

export default {
  SUPPORTED_FORMATS,
  toBarcodeDetectorFormat,
  toZXingFormat,
  toBwipFormat,
  fromExternalFormat,
  getDisplayName,
  getDescription,
  getType,
  getCategory,
  isSupported,
  getAllFormats,
  getFormatsByType,
  getFormatsByCategory,
  validateText,
  getRecommendedSettings,
  init: initFormats,
};
