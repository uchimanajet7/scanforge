/**
 * ScanForge - 検出ジオメトリ共通ヘルパー
 *
 * バウンディングボックスやポイント座標の正規化処理を提供する。
 * スキャナー周辺の各モジュール（検出データのキャッシュキー生成や
 * オーバーレイ描画など）で共通利用する。
 */

export const DETECTION_CACHE_CELL_SIZE = 48;

/**
 * バウンディングボックスを正規化
 * @param {Object} candidate - バウンディングボックス候補
 * @returns {{x:number,y:number,width:number,height:number}|null}
 */
export function normalizeBoundingBox(candidate) {
  if (!candidate) {
    return null;
  }

  const x = toFiniteNumber(candidate.x ?? candidate.left);
  const y = toFiniteNumber(candidate.y ?? candidate.top);

  let width = toFiniteNumber(candidate.width);
  if (width === null && candidate.right !== undefined && candidate.left !== undefined) {
    width = toFiniteNumber(candidate.right - candidate.left);
  }

  let height = toFiniteNumber(candidate.height);
  if (height === null && candidate.bottom !== undefined && candidate.top !== undefined) {
    height = toFiniteNumber(candidate.bottom - candidate.top);
  }

  if ([x, y, width, height].every(Number.isFinite)) {
    return { x, y, width, height };
  }

  return null;
}

/**
 * 検出結果からバウンディングボックスを抽出
 * @param {Object} detection - 検出結果
 * @returns {{x:number,y:number,width:number,height:number}|null}
 */
export function getDetectionBoundingBox(detection) {
  if (!detection) {
    return null;
  }

  const candidates = [
    detection.boundingBox,
    detection.raw?.boundingBox,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeBoundingBox(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

/**
 * 検出結果からキャッシュキーを生成
 * @param {Object} detection - 検出結果
 * @param {number} cellSize - セルサイズ
 * @returns {string|null} キャッシュキー
 */
export function buildDetectionCacheKey(detection, cellSize = DETECTION_CACHE_CELL_SIZE) {
  if (!detection) {
    return null;
  }

  const format = String(detection.format || 'unknown').toLowerCase();
  const rawText = detection.text ?? detection.rawValue ?? '';
  const text = String(rawText).trim();

  if (!text) {
    return null;
  }

  const box = getDetectionBoundingBox(detection);
  if (box) {
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    const cellX = Math.round(centerX / cellSize);
    const cellY = Math.round(centerY / cellSize);
    return `${format}:${text}:${cellX}:${cellY}`;
  }

  return `${format}:${text}`;
}

/**
 * ポイント情報を正規化
 * @param {Array} points - ポイント配列
 * @returns {Array<{x:number,y:number}>}
 */
export function toPointList(points) {
  if (!Array.isArray(points)) {
    return [];
  }
  return points
    .map((point) => {
      const x = toFiniteNumber(point?.x ?? point?.X ?? point?.getX?.());
      const y = toFiniteNumber(point?.y ?? point?.Y ?? point?.getY?.());
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        return null;
      }
      return { x, y };
    })
    .filter(Boolean);
}

/**
 * 有限数へ正規化
 * @param {*} value - 値
 * @returns {number|null}
 */
function toFiniteNumber(value) {
  if (value === undefined || value === null) {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

