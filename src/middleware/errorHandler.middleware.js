import { ApiError } from '../common/utils/apiError.js';
import { logger } from '../config/logger.js';
import { isProd } from '../config/env.js';

export function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  let error = err;

  if (!(error instanceof ApiError)) {
    const statusCode = error.name === 'ValidationError' ? 400 : 500;
    error = new ApiError(statusCode, error.message || 'Internal server error');
  }

  if (!error.isOperational) {
    logger.error({ err }, 'Unexpected error');
  } else {
    logger.warn({ err: error.message, statusCode: error.statusCode }, 'Handled error');
  }

  res.status(error.statusCode).json({
    success: false,
    message: error.message,
    ...(error.details ? { details: error.details } : {}),
    ...(!isProd && error.stack ? { stack: error.stack } : {}),
  });
}

