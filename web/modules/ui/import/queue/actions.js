/**
 * ジョブステータス別のアクション定義を提供する。
 */

export function getJobActions(job) {
  switch (job.status) {
    case 'queued':
    case 'preparing':
    case 'scanning':
    case 'retrying':
      return [{ action: 'cancel', label: 'キャンセル', variant: 'ghost', ariaLabel: 'キャンセル' }];
    case 'failed':
      return [
        { action: 'retry', label: '再試行', variant: 'primary', ariaLabel: '再試行する' },
        { action: 'remove', label: '削除', variant: 'ghost', ariaLabel: '削除する' },
      ];
    case 'canceled':
      return [
        { action: 'retry', label: '再解析', variant: 'primary', ariaLabel: '再解析する' },
        { action: 'remove', label: '削除', variant: 'ghost', ariaLabel: '削除する' },
      ];
    case 'success':
      return [
        { action: 'retry', label: '再解析', variant: 'ghost', ariaLabel: '再解析する' },
        { action: 'remove', label: '削除', variant: 'ghost', ariaLabel: '削除する' },
      ];
    default:
      return [{ action: 'remove', label: '削除', variant: 'ghost', ariaLabel: '削除する' }];
  }
}
