/**
 * ライブスキャン用タイマー管理。
 */

import { setState } from '../../core/state/base.js';
import { clearAutoResumeState } from '../../core/state/scanner/auto-resume.js';
import {
  clearResumeTimerRef,
  getResumeTimer,
  setResumeTimer,
} from '../context.js';

export function clearResumeTimer() {
  const timer = getResumeTimer();
  if (timer) {
    clearTimeout(timer);
    setResumeTimer(null);
    setState('scanner.resumeTimer', null);
  }
  clearAutoResumeState();
}

export { getResumeTimer, setResumeTimer, clearResumeTimerRef };
