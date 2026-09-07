/**
 * WebMCP tool 登録のライフサイクルを管理する。
 */

import { logger } from '../core/logger.js';
import { WEBMCP_TOOL_DEFINITIONS } from './schemas.js';
import { executeGenerateCode } from './tools/generate-code.js';
import { executeGetScanHistory } from './tools/get-scan-history.js';
import { executePrepareScanForgeExport } from './tools/prepare-scanforge-export.js';
import { executeReadScanForgeExport } from './tools/read-scanforge-export.js';
import { executeReleaseScanForgeExport } from './tools/release-scanforge-export.js';
import { executeRequestGeneratedCodeDownload } from './tools/request-generated-code-download.js';
import { executeRequestScanHistoryDownload } from './tools/request-scan-history-download.js';
import { executeScanCurrentFrame } from './tools/scan-current-frame.js';
import { executeStartCamera } from './tools/start-camera.js';
import { executeStopCamera } from './tools/stop-camera.js';

const TOOL_EXECUTORS = Object.freeze({
  'generate-code': executeGenerateCode,
  'request-generated-code-download': executeRequestGeneratedCodeDownload,
  'start-camera': executeStartCamera,
  'scan-current-frame': executeScanCurrentFrame,
  'stop-camera': executeStopCamera,
  'get-scan-history': executeGetScanHistory,
  'request-scan-history-download': executeRequestScanHistoryDownload,
  'prepare-scanforge-export': executePrepareScanForgeExport,
  'read-scanforge-export': executeReadScanForgeExport,
  'release-scanforge-export': executeReleaseScanForgeExport,
});

let registrationController = null;

function getModelContext() {
  if (typeof document === 'undefined') {
    return null;
  }
  return document.modelContext ?? null;
}

export async function initWebMcp() {
  disposeWebMcp();

  const modelContext = getModelContext();
  if (typeof modelContext?.registerTool !== 'function') {
    logger.debug('webmcp:unsupported');
    return { supported: false, registered: 0 };
  }

  const controller = new AbortController();
  registrationController = controller;
  let registered = 0;

  try {
    for (const definition of WEBMCP_TOOL_DEFINITIONS) {
      controller.signal.throwIfAborted();
      await modelContext.registerTool({
        ...definition,
        execute: TOOL_EXECUTORS[definition.name],
      }, {
        signal: controller.signal,
      });
      controller.signal.throwIfAborted();
      registered += 1;
    }

    logger.info('webmcp:registration:complete', { registered });
    return { supported: true, registered };
  } catch {
    if (registrationController === controller) {
      registrationController = null;
    }
    if (!controller.signal.aborted) {
      controller.abort();
    }
    logger.warn('webmcp:registration:failed');
    return { supported: true, registered: 0 };
  }
}

export function disposeWebMcp() {
  const controller = registrationController;
  registrationController = null;
  if (controller && !controller.signal.aborted) {
    controller.abort();
  }
}
