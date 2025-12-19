/**
 * 非極大抑制（NMS）ロジック。
 */

export function applyNonMaxSuppression(results, iouThreshold = 0.5) {
  if (results.length <= 1) {
    return results;
  }

  const groups = new Map();
  results.forEach(result => {
    const key = `${result.format}:${result.text}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(result);
  });

  const filtered = [];

  groups.forEach((group) => {
    if (group.length === 1) {
      filtered.push(group[0]);
      return;
    }

    group.sort((a, b) => {
      const areaA = a.boundingBox.width * a.boundingBox.height;
      const areaB = b.boundingBox.width * b.boundingBox.height;
      return areaB - areaA;
    });

    const keep = [];
    const suppressed = new Set();

    for (let i = 0; i < group.length; i += 1) {
      if (suppressed.has(i)) {
        continue;
      }

      keep.push(group[i]);

      for (let j = i + 1; j < group.length; j += 1) {
        if (suppressed.has(j)) {
          continue;
        }
        const iou = calculateIoU(group[i].boundingBox, group[j].boundingBox);
        if (iou > iouThreshold) {
          suppressed.add(j);
        }
      }
    }

    filtered.push(...keep);
  });

  return filtered;
}

export function calculateIoU(box1, box2) {
  const x1 = Math.max(box1.x, box2.x);
  const y1 = Math.max(box1.y, box2.y);
  const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
  const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);

  if (x2 < x1 || y2 < y1) {
    return 0;
  }

  const intersection = (x2 - x1) * (y2 - y1);
  const area1 = box1.width * box1.height;
  const area2 = box2.width * box2.height;
  const union = area1 + area2 - intersection;

  return union > 0 ? intersection / union : 0;
}
