/**
 * ビルド情報の検証ユーティリティ。
 */

export function validateBuildInfo(info) {
  const issues = [];
  const warnings = [];

  if (info.hash === '0000000' || info.hash === 'unknown') {
    warnings.push('Build hash is not set properly. This should be set by CI/CD.');
  }

  if (info.timestamp) {
    const buildDate = new Date(info.timestamp);
    const now = new Date();
    const daysDiff = (now - buildDate) / (1000 * 60 * 60 * 24);

    if (daysDiff > 30) {
      warnings.push(`Build is ${Math.floor(daysDiff)} days old. Consider updating.`);
    }
  }

  if (info.version && !/^\d+\.\d+\.\d+(-\w+)?/.test(info.version)) {
    warnings.push('Version format is non-standard. Expected format: x.y.z[-tag]');
  }

  return {
    valid: issues.length === 0,
    issues,
    warnings,
  };
}
