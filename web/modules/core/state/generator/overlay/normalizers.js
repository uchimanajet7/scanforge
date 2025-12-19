import { createDefaultGeneratorOverlayState } from './defaults.js';

export function cloneGeneratorOverlayState(source = createDefaultGeneratorOverlayState()) {
  const validation = source.validation || {};
  const warnings = Array.isArray(validation.warnings) ? [...validation.warnings] : [];
  const errors = Array.isArray(validation.errors) ? [...validation.errors] : [];
  const autoEcc = source.autoEcc || {};
  const colorProfile = source.colorProfile || {};
  const palette = Array.isArray(colorProfile.palette)
    ? colorProfile.palette.map(item => ({
        hex: typeof item.hex === 'string' ? item.hex : '',
        l: Number.isFinite(item.l) ? Number(item.l) : 0,
        c: Number.isFinite(item.c) ? Number(item.c) : 0,
        h: Number.isFinite(item.h) ? Number(item.h) : 0,
        luminance: Number.isFinite(item.luminance) ? Number(item.luminance) : 0,
        count: Number.isFinite(item.count) ? Number(item.count) : 0,
        ratio: Number.isFinite(item.ratio) ? Number(item.ratio) : 0,
      }))
    : [];
  const colorMatch = source.colorMatch || {};
  const colorWarnings = Array.isArray(colorMatch.warnings) ? [...colorMatch.warnings] : [];
  return {
    enabled: !!source.enabled,
    hasAsset: !!source.hasAsset,
    fileName: source.fileName || '',
    fileSize: Number(source.fileSize) || 0,
    fileType: source.fileType || '',
    objectUrl: typeof source.objectUrl === 'string' ? source.objectUrl : null,
    sizePercent: Number.isFinite(source.sizePercent) ? source.sizePercent : 15,
    minPercent: Number.isFinite(source.minPercent) ? source.minPercent : 10,
    maxPercent: Number.isFinite(source.maxPercent) ? source.maxPercent : 20,
    useBadge: source.useBadge !== false,
    badgeShape: source.badgeShape === 'circle' ? 'circle' : 'rounded',
    eccLevel: ['L', 'M', 'Q', 'H'].includes((source.eccLevel || '').toUpperCase())
      ? source.eccLevel.toUpperCase()
      : 'M',
    autoEcc: {
      level: ['L', 'M', 'Q', 'H'].includes((autoEcc.level || '').toUpperCase())
        ? autoEcc.level.toUpperCase()
        : 'M',
      summary: typeof autoEcc.summary === 'string' ? autoEcc.summary : '',
      reason: typeof autoEcc.reason === 'string' ? autoEcc.reason : '',
      risk: ['low', 'medium', 'high'].includes(autoEcc.risk) ? autoEcc.risk : 'low',
      riskLabel: typeof autoEcc.riskLabel === 'string' ? autoEcc.riskLabel : '標準',
      moduleSizePx: Number.isFinite(autoEcc.moduleSizePx) ? Number(autoEcc.moduleSizePx) : null,
      minModulePx: Number.isFinite(autoEcc.minModulePx) ? Number(autoEcc.minModulePx) : 3,
      meetsRisk: autoEcc.meetsRisk !== false,
      warnings: Array.isArray(autoEcc.warnings) ? [...autoEcc.warnings] : [],
      warningMessage: typeof autoEcc.warningMessage === 'string' ? autoEcc.warningMessage : '',
    },
    lastUpdatedAt: Number.isFinite(source.lastUpdatedAt) ? Number(source.lastUpdatedAt) : null,
    colorProfile: {
      palette,
      sourceHex: typeof colorProfile.sourceHex === 'string' ? colorProfile.sourceHex : '',
      backgroundHex: typeof colorProfile.backgroundHex === 'string' ? colorProfile.backgroundHex : '#FFFFFF',
      totalSamples: Number.isFinite(colorProfile.totalSamples) ? Number(colorProfile.totalSamples) : 0,
      lastUpdatedAt: Number.isFinite(colorProfile.lastUpdatedAt) ? Number(colorProfile.lastUpdatedAt) : null,
    },
    colorMatch: {
      enabled: !!colorMatch.enabled,
      active: !!colorMatch.active,
      status: ['idle', 'pending', 'ready', 'error'].includes(colorMatch.status) ? colorMatch.status : 'idle',
      mode: ['disabled', 'auto', 'manual'].includes(colorMatch.mode) ? colorMatch.mode : 'disabled',
      sourceHex: typeof colorMatch.sourceHex === 'string' ? colorMatch.sourceHex : '',
      foregroundHex: typeof colorMatch.foregroundHex === 'string' ? colorMatch.foregroundHex : '#0B0B0B',
      backgroundHex: typeof colorMatch.backgroundHex === 'string' ? colorMatch.backgroundHex : '#FFFFFF',
      autoForegroundHex: typeof colorMatch.autoForegroundHex === 'string' ? colorMatch.autoForegroundHex : '#0B0B0B',
      autoBackgroundHex: typeof colorMatch.autoBackgroundHex === 'string' ? colorMatch.autoBackgroundHex : '#FFFFFF',
      manualForegroundHex: typeof colorMatch.manualForegroundHex === 'string' ? colorMatch.manualForegroundHex : '',
      manualBackgroundHex: typeof colorMatch.manualBackgroundHex === 'string' ? colorMatch.manualBackgroundHex : '',
      contrastRatio: Number.isFinite(colorMatch.contrastRatio) ? Number(colorMatch.contrastRatio) : null,
      symbolContrast: Number.isFinite(colorMatch.symbolContrast) ? Number(colorMatch.symbolContrast) : null,
      method: typeof colorMatch.method === 'string' ? colorMatch.method : 'default',
      fallbackApplied: !!colorMatch.fallbackApplied,
      gradeLabel: typeof colorMatch.gradeLabel === 'string' ? colorMatch.gradeLabel : '--',
      message: typeof colorMatch.message === 'string' ? colorMatch.message : '',
      warnings: colorWarnings,
    },
    validation: {
      quietZone: {
        ok: validation?.quietZone?.ok !== false,
        message: typeof validation?.quietZone?.message === 'string' ? validation.quietZone.message : '',
      },
      reservedPatterns: {
        ok: validation?.reservedPatterns?.ok !== false,
        message: typeof validation?.reservedPatterns?.message === 'string' ? validation.reservedPatterns.message : '',
      },
      ecc: {
        ok: validation?.ecc?.ok !== false,
        message: typeof validation?.ecc?.message === 'string' ? validation.ecc.message : '',
      },
      format: {
        ok: validation?.format?.ok !== false,
        message: typeof validation?.format?.message === 'string' ? validation.format.message : '',
      },
      zxing: {
        status: validation?.zxing?.status || 'idle',
        ok: typeof validation?.zxing?.ok === 'boolean' ? validation.zxing.ok : null,
        message: typeof validation?.zxing?.message === 'string' ? validation.zxing.message : '',
      },
      warnings,
      errors,
      overallOk: validation?.overallOk !== false && warnings.length === 0 && errors.length === 0,
    },
    verification: {
      lastStatus: ['idle', 'pending', 'passed', 'failed'].includes(source.verification?.lastStatus)
        ? source.verification.lastStatus
        : 'idle',
      timestamp: Number.isFinite(source.verification?.timestamp) ? Number(source.verification.timestamp) : null,
      reader: typeof source.verification?.reader === 'string' ? source.verification.reader : 'zxing-js',
      details: source.verification?.details ?? null,
    },
  };
}
