/**
 * タブ関連の DOM 要素取得ユーティリティ。
 */

import { get } from '../core/dom/query.js';

export function assignTabElements(target) {
  target.tabList = get('[role="tablist"]');
  target.tabs = get('[role="tab"]', target.tabList, true);
  target.panels = get('.screen[data-route]', document, true);
  return target;
}
