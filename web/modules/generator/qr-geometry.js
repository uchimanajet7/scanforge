/**
 * ScanForge - QR ジオメトリユーティリティ
 *
 * QR コード（ISO/IEC 18004:2024 Model 2）のモジュール配置に関する計算を提供する。
 * ロゴオーバーレイ検証やレイアウト計算で使用する。
 */

const ALIGNMENT_PATTERN_LOCATIONS = [
  null,
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
  [6, 30, 54],
  [6, 32, 58],
  [6, 34, 62],
  [6, 26, 46, 66],
  [6, 26, 48, 70],
  [6, 26, 50, 74],
  [6, 30, 54, 78],
  [6, 30, 56, 82],
  [6, 30, 58, 86],
  [6, 34, 62, 90],
  [6, 28, 50, 72, 94],
  [6, 26, 50, 74, 98],
  [6, 30, 54, 78, 102],
  [6, 28, 54, 80, 106],
  [6, 32, 58, 84, 110],
  [6, 30, 58, 86, 114],
  [6, 34, 62, 90, 118],
  [6, 26, 50, 74, 98, 122],
  [6, 30, 54, 78, 102, 126],
  [6, 26, 52, 78, 104, 130],
  [6, 30, 56, 82, 108, 134],
  [6, 34, 60, 86, 112, 138],
  [6, 30, 58, 86, 114, 142],
  [6, 34, 62, 90, 118, 146],
  [6, 30, 54, 78, 102, 126, 150],
  [6, 24, 50, 76, 102, 128, 154],
  [6, 28, 54, 80, 106, 132, 158],
  [6, 32, 58, 84, 110, 136, 162],
  [6, 26, 54, 82, 110, 138, 166],
  [6, 30, 58, 86, 114, 142, 170],
];

const FINDER_EXTENT = 8; // 7 モジュールのファインダー + 1 モジュール白色セパレーター
const FINDER_COUNT = 3;
const TIMING_INDEX = 6;

/**
 * モジュール数から QR バージョンを推定
 * @param {number} moduleCount - データ部のモジュール数（静寂域を除く一辺の長さ）
 * @returns {number|null} バージョン（1〜40）
 */
export function deriveVersionFromModuleCount(moduleCount) {
  if (!Number.isFinite(moduleCount)) {
    return null;
  }
  const version = (moduleCount - 17) / 4;
  if (!Number.isInteger(version)) {
    return null;
  }
  if (version < 1 || version > 40) {
    return null;
  }
  return version;
}

/**
 * バージョンごとのアライメントパターン中心位置配列を取得
 * @param {number} version - QR バージョン
 * @returns {Array<number>} 中心座標配列
 */
export function getAlignmentPatternCenters(version) {
  if (!Number.isInteger(version) || version < 1 || version > 40) {
    return [];
  }
  const centers = ALIGNMENT_PATTERN_LOCATIONS[version];
  return Array.isArray(centers) ? [...centers] : [];
}

/**
 * アライメントパターン中心座標を組み合わせて座標ペア集合を生成
 * @param {number} version - QR バージョン
 * @param {number} moduleCount - データ部モジュール数
 * @returns {Array<{x:number,y:number}>} 座標ペア
 */
export function enumerateAlignmentCoordinates(version, moduleCount) {
  const centers = getAlignmentPatternCenters(version);
  if (centers.length === 0) {
    return [];
  }

  const coords = new Map();
  centers.forEach((x) => {
    centers.forEach((y) => {
      if (shouldSkipAlignmentAt(x, y, moduleCount)) {
        return;
      }
      const key = `${x},${y}`;
      if (!coords.has(key)) {
        coords.set(key, { x, y });
      }
    });
  });

  return Array.from(coords.values());
}

function shouldSkipAlignmentAt(x, y, moduleCount) {
  const nearTop = y <= FINDER_EXTENT - 1;
  const nearBottom = y >= moduleCount - FINDER_EXTENT;
  const nearLeft = x <= FINDER_EXTENT - 1;
  const nearRight = x >= moduleCount - FINDER_EXTENT;

  // ファインダーパターン領域と重なる場合はスキップ
  if ((nearLeft && nearTop) || (nearRight && nearTop) || (nearLeft && nearBottom)) {
    return true;
  }
  return false;
}

/**
 * ファインダーパターン領域の境界を取得
 * @param {number} moduleCount - データ部モジュール数
 * @returns {Array<{x0:number,y0:number,x1:number,y1:number}>}
 */
export function buildFinderPatternBounds(moduleCount) {
  const extent = FINDER_EXTENT - 1; // inclusive index
  const maxIndex = moduleCount - 1;
  return [
    { x0: 0, y0: 0, x1: extent, y1: extent },
    { x0: moduleCount - FINDER_EXTENT, y0: 0, x1: maxIndex, y1: extent },
    { x0: 0, y0: moduleCount - FINDER_EXTENT, x1: extent, y1: maxIndex },
  ];
}

/**
 * アライメントパターン領域の境界を取得
 * @param {number} version - QR バージョン
 * @param {number} moduleCount - データ部モジュール数
 * @returns {Array<{x0:number,y0:number,x1:number,y1:number}>}
 */
export function buildAlignmentPatternBounds(version, moduleCount) {
  const coords = enumerateAlignmentCoordinates(version, moduleCount);
  return coords.map(({ x, y }) => {
    const x0 = clamp(x - 2, 0, moduleCount - 1);
    const x1 = clamp(x + 2, 0, moduleCount - 1);
    const y0 = clamp(y - 2, 0, moduleCount - 1);
    const y1 = clamp(y + 2, 0, moduleCount - 1);
    return { x0, y0, x1, y1 };
  });
}

/**
 * オーバーレイ領域と各種保護領域の交差を評価
 * @param {Object} params - 判定パラメータ
 * @param {number} params.moduleCount - データ部モジュール数
 * @param {number} params.start - オーバーレイ領域の開始インデックス（データ部基準）
 * @param {number} params.end - オーバーレイ領域の終了インデックス（データ部基準）
 * @param {number} [params.badgeMargin=0] - バッジ余白モジュール数
 * @param {number|null} [params.version=null] - QR バージョン
 * @returns {{finder:boolean,timing:boolean,alignment:Array<number>}}
 */
export function evaluateReservedPatternConflicts({ moduleCount, start, end, badgeMargin = 0, version = null }) {
  const expandedStart = clamp(start - badgeMargin, 0, moduleCount - 1);
  const expandedEnd = clamp(end + badgeMargin, 0, moduleCount - 1);

  const conflicts = {
    finder: [],
    timing: false,
    alignment: [],
  };

  // ファインダーパターン
  buildFinderPatternBounds(moduleCount).forEach((bounds, index) => {
    if (intersectsSquare(bounds, expandedStart, expandedEnd)) {
      conflicts.finder.push(`finder-${index % FINDER_COUNT}`);
    }
  });

  // タイミングパターン（行・列 index 6）
  if (lineIntersectsRange(TIMING_INDEX, expandedStart, expandedEnd)) {
    conflicts.timing = true;
  }

  // アライメントパターン
  if (Number.isInteger(version) && version >= 2) {
    const boundsList = buildAlignmentPatternBounds(version, moduleCount);
    boundsList.forEach((bounds, idx) => {
      if (intersectsSquare(bounds, expandedStart, expandedEnd)) {
        conflicts.alignment.push(`alignment-${idx}`);
      }
    });
  }

  return conflicts;
}

function intersectsSquare(bounds, start, end) {
  if (!bounds) {
    return false;
  }
  const xOverlap = !(end < bounds.x0 || start > bounds.x1);
  const yOverlap = !(end < bounds.y0 || start > bounds.y1);
  return xOverlap && yOverlap;
}

function lineIntersectsRange(lineIndex, start, end) {
  return start <= lineIndex && lineIndex <= end;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export const QR_GEOMETRY = {
  ALIGNMENT_PATTERN_LOCATIONS,
  FINDER_EXTENT,
  TIMING_INDEX,
};

export default {
  deriveVersionFromModuleCount,
  getAlignmentPatternCenters,
  enumerateAlignmentCoordinates,
  buildFinderPatternBounds,
  buildAlignmentPatternBounds,
  evaluateReservedPatternConflicts,
  QR_GEOMETRY,
};
