/**
 * 検出結果をアプリ内で扱いやすい形に正規化する純粋関数モジュール。
 */

import {
  getDetectionBoundingBox,
  toPointList,
} from '../geometry.js';

function resolveEngineValue(detection, resolveEngine) {
  if (detection?.engine) {
    return detection.engine;
  }
  if (typeof resolveEngine === 'function') {
    try {
      return resolveEngine();
    } catch {
      // resolveEngine は任意。失敗時は engine 不明として扱う。
      return undefined;
    }
  }
  return resolveEngine;
}

export function normalizeDetectionResult(
  detection,
  { source = 'live', resolveEngine } = {},
) {
  if (!detection) {
    return null;
  }

  const normalized = {
    text: detection.text ?? detection.rawValue ?? '',
    rawValue: detection.rawValue ?? detection.text ?? '',
    format: String(detection.format || 'unknown').toLowerCase(),
    timestamp: Number(detection.timestamp) || Date.now(),
    engine: resolveEngineValue(detection, resolveEngine),
    source,
    raw: detection.raw ?? null,
  };

  if (!normalized.engine) {
    normalized.engine = 'unknown';
  }

  const boundingBox = getDetectionBoundingBox(detection);
  if (boundingBox) {
    normalized.boundingBox = boundingBox;
  }

  const cornerCandidates = detection.cornerPoints || detection.raw?.cornerPoints;
  const points = toPointList(cornerCandidates);
  if (points.length) {
    normalized.cornerPoints = points;
  }

  return normalized;
}
