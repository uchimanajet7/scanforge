/**
 * スキャナー UI 用メッセージとボタン状態。
 */
export const STATUS_MESSAGES = Object.freeze({
  idle: {
    primary: 'カメラの準備ができていません。',
    secondary: '「カメラを開始」を押してスキャンを開始してください。',
  },
  initializing: {
    primary: 'カメラを初期化しています…',
    secondary: 'ブラウザの権限ダイアログが表示される場合があります。',
  },
  scanning: {
    primary: 'スキャン中です',
    secondary: 'コードをカメラにかざしてください。',
  },
  autoResume: {
    primary: '検出結果を表示中です',
    secondary: '自動再開までお待ちいただくか、手動解析を実行できます。',
  },
  autoResumeFailed: {
    primary: '自動再開に失敗しました',
    secondary: '再度「再開」を押してください。',
  },
  pausedDetection: {
    primary: '検出結果を表示中です',
    secondary: '手動解析または「再開」で続行できます。',
  },
  pausedManual: {
    primary: 'スキャンを一時停止しました',
    secondary: '手動解析は引き続き利用できます。',
  },
  stopped: {
    primary: 'スキャンを停止しました',
    secondary: '再開するには「カメラを開始」を押してください。',
  },
  startFailed: {
    primary: 'カメラの起動に失敗しました',
    secondary: '権限と他アプリの利用状況を確認してください。',
  },
});

export const PRIMARY_BUTTON_STATES = Object.freeze({
  idle: {
    label: 'カメラを開始',
    variant: '',
    disabled: false,
  },
  starting: {
    label: 'カメラを起動中…',
    variant: 'is-loading',
    disabled: true,
  },
  scanning: {
    label: 'カメラを停止',
    variant: 'is-danger',
    disabled: false,
  },
  pausedDetection: {
    label: 'スキャンを再開',
    variant: '',
    disabled: false,
  },
  pausedManual: {
    label: 'スキャンを再開',
    variant: '',
    disabled: false,
  },
});
