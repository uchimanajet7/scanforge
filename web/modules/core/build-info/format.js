/**
 * ビルド情報のフォーマットユーティリティ。
 */

export function formatBuildLabel(info) {
  if (!info) {
    return 'build unknown';
  }
  return `build ${info.version || 'unknown'} • ${info.hash || 'unknown'}`;
}

export function formatBuildDetails(info) {
  if (!info) {
    return 'Build information not available';
  }

  const parts = [];
  if (info.version) parts.push(`Version: ${info.version}`);
  if (info.hash) parts.push(`Hash: ${info.hash}`);
  if (info.timestamp) parts.push(`Built: ${info.timestamp}`);
  if (info.environment) parts.push(`Environment: ${info.environment}`);

  return parts.join(' | ');
}
