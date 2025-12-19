/**
 * 画像解析専用のエラークラス。
 */

export class ImageScanError extends Error {
  constructor(message, code, options = {}) {
    super(message);
    this.name = 'ImageScanError';
    this.code = code;
    if (options.cause) {
      this.cause = options.cause;
    }
  }
}

export default ImageScanError;
