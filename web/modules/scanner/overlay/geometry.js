/**
 * 検出結果の幾何情報を変換。
 */

import {
  buildDetectionCacheKey,
  getDetectionBoundingBox,
  toPointList,
} from '../geometry.js';

export function toOverlayGeometry(detection) {
  const box = detection.boundingBox || getDetectionBoundingBox(detection);
  if (!box || box.width <= 0 || box.height <= 0) {
    return null;
  }

  const key = buildDetectionCacheKey(detection) || `${detection.format}:${detection.text}`;
  return {
    id: key,
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    points: detection.cornerPoints || toPointList(detection.raw?.cornerPoints),
  };
}
