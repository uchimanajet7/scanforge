/**
 * 生成結果のファイル名構築。
 */

export function buildDownloadName({ format, output, logoPriority }) {
  const prefix = logoPriority ? 'logo' : 'normal';
  const ext = output === 'svg' ? 'svg' : 'png';
  const formatSlug = format.replace(/[^a-z0-9]+/gi, '-');
  const timestamp = new Date().toISOString().replace(/[:.-]/g, '').slice(0, 14);
  return `scanforge-${prefix}-${formatSlug}-${timestamp}.${ext}`;
}
