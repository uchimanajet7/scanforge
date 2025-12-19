/**
 * ビルド情報を生成するユーティリティ。
 */

export function generateBuildInfo() {
  const isDevelopment =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.protocol === 'file:';

  if (isDevelopment) {
    return {
      version: '0.1.0-dev',
      hash: `dev-${Date.now().toString(36).slice(-7)}`,
      timestamp: new Date().toISOString(),
      environment: 'development',
    };
  }

  return {
    version: typeof __BUILD_VERSION__ !== 'undefined' ? __BUILD_VERSION__ : '0.1.0',
    hash: typeof __BUILD_HASH__ !== 'undefined' ? __BUILD_HASH__ : 'unknown',
    timestamp: typeof __BUILD_TIMESTAMP__ !== 'undefined' ? __BUILD_TIMESTAMP__ : new Date().toISOString(),
    environment: 'production',
  };
}
