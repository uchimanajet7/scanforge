/**
 * ロガーヘルパー。
 */

export function createError(code, message, details = {}) {
  return {
    code,
    message,
    timestamp: new Date().toISOString(),
    ...details,
  };
}

export function formatError(error) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  if (typeof error === 'object' && error !== null) {
    return error;
  }

  return {
    message: String(error),
  };
}
