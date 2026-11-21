/**
 * Global Error Handler Middleware
 * Intercepts DomainError instances and unexpected system exceptions.
 * Strictly implements Task BE-06 format.
 */

import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { DomainError } from '../errors/domain.error';

export const errorHandler: ErrorRequestHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // 1. Handled Domain Errors (EntityNotFoundError, InvalidStateTransitionError, IncompatibleHardwareError...)
  if (err instanceof DomainError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  // 2. Unhandled Internal Server Errors
  console.error('[Internal Server Error]:', err);

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: err.message || 'Đã xảy ra lỗi hệ thống không mong muốn.',
    },
  });
};

export default errorHandler;
