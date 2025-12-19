import { getState } from '../../core/state/base.js';

export function getHistory(options = {}) {
  const {
    limit = null,
    offset = 0,
    format = null,
    search = null,
    sortBy = 'timestamp',
    sortOrder = 'desc',
  } = options;

  let items = getState('history.items') || [];

  if (format) {
    items = items.filter((item) => item.format === format);
  }

  if (search) {
    const keyword = search.toLowerCase();
    items = items.filter((item) =>
      item.text.toLowerCase().includes(keyword) ||
      item.format.toLowerCase().includes(keyword)
    );
  }

  items.sort((a, b) => {
    let aValue = a[sortBy];
    let bValue = b[sortBy];

    if (sortBy === 'timestamp') {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    }

    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    }
    return aValue < bValue ? 1 : -1;
  });

  if (limit != null) {
    return items.slice(offset, offset + limit);
  }

  return items;
}

export function getHistoryById(id) {
  const items = getState('history.items');
  return items.find((item) => item.id === id) || null;
}

export function getHistoryCount() {
  const items = getState('history.items');
  return items.length;
}
