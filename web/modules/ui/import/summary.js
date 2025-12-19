/**
 * サマリーと進捗表示
 */

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export default function createSummaryModule(context) {
  const { elements } = context;

  function render(imageState = {}, queue = []) {
    const status = imageState.status || 'idle';
    if (elements.section) {
      elements.section.dataset.state = status;
    }
    if (elements.card) {
      elements.card.dataset.state = status;
    }

    const overall = imageState.overall || {
      totalBytes: 0,
      processedBytes: 0,
      completed: 0,
      failed: 0,
      canceled: 0,
    };

    const activeCount = queue.filter(job => ['queued', 'preparing', 'scanning', 'retrying'].includes(job.status)).length;
    const queuedCount = queue.length;
    const completedCount = overall.completed || 0;
    const failedCount = overall.failed || 0;

    if (elements.summaryCount) {
      elements.summaryCount.textContent = `${queuedCount} 件`;
    }

    if (elements.summaryStatus) {
      elements.summaryStatus.textContent = [
        activeCount ? `実行中 ${activeCount} 件` : null,
        failedCount ? `失敗 ${failedCount} 件` : null,
        completedCount ? `成功 ${completedCount} 件` : null,
      ].filter(Boolean).join(' / ') || '待機中';
    }

    if (elements.progressBar && elements.progressValue) {
      const total = overall.totalBytes || 0;
      const processed = overall.processedBytes || 0;
      if (total > 0) {
        const ratio = clamp(processed / total, 0, 1);
        elements.progressValue.style.width = `${(ratio * 100).toFixed(2)}%`;
        elements.progressBar.setAttribute('aria-valuemin', '0');
        elements.progressBar.setAttribute('aria-valuemax', '100');
        elements.progressBar.setAttribute('aria-valuenow', Math.round(ratio * 100).toString());
        elements.progressBar.dataset.mode = 'determinate';
      } else {
        const hasActive = activeCount > 0;
        elements.progressValue.style.width = hasActive ? '50%' : '0%';
        elements.progressBar.removeAttribute('aria-valuenow');
        elements.progressBar.dataset.mode = hasActive ? 'indeterminate' : 'idle';
      }
    }

    if (elements.retryFailed) {
      elements.retryFailed.disabled = failedCount === 0;
    }

    if (elements.abortActive) {
      const hasActiveJobs = queue.some(job =>
        ['queued', 'preparing', 'scanning', 'retrying'].includes(job.status));
      elements.abortActive.disabled = !hasActiveJobs;
    }

    if (elements.reset) {
      const hasQueueItems = queue.length > 0;
      elements.reset.disabled = !hasQueueItems;
      if (hasQueueItems) {
        elements.reset.removeAttribute('aria-disabled');
        elements.reset.title = '投入済みの処理をすべて取り消します';
      } else {
        elements.reset.setAttribute('aria-disabled', 'true');
        elements.reset.title = 'クリアできる処理はありません';
      }
    }
  }

  return {
    init() {},
    destroy() {},
    render,
  };
}
