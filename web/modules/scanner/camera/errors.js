/**
 * カメラ関連のエラークラス。
 */

export class CameraPermissionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CameraPermissionError';
  }
}

export class CameraNotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CameraNotFoundError';
  }
}

export class CameraInUseError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CameraInUseError';
  }
}

export const cameraErrors = {
  CameraPermissionError,
  CameraNotFoundError,
  CameraInUseError,
};

export default cameraErrors;
