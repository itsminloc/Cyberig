/**
 * Global Error Handler Middleware
 * Intercepts DomainError instances and unexpected system exceptions.
 * Strictly implements Task BE-06 format.
 */

import { randomUUID } from 'node:crypto';
import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { DomainError } from '../errors/domain.error';
import { config } from '../config';

export const errorHandler: ErrorRequestHandler = (
  err: Error & { status?: number; statusCode?: number; type?: string },
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

  // 2. Express Body Parser Payload Too Large (HTTP 413)
  if (err.type === 'entity.too.large' || err.status === 413) {
    res.status(413).json({
      success: false,
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Dung lượng dữ liệu gửi lên vượt quá giới hạn cho phép (tối đa 100KB).',
      },
    });
    return;
  }

  // 3. Malformed JSON Syntax Error (HTTP 400)
  if (err.type === 'entity.parse.failed' || (err instanceof SyntaxError && err.status === 400)) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_JSON',
        message: 'Định dạng JSON trong yêu cầu không hợp lệ.',
      },
    });
    return;
  }

  // 4. Unhandled Internal Server Errors (Sanitized in Production with traceId)
  const traceId = randomUUID().slice(0, 12);
  console.error(`[Internal Server Error][traceId=${traceId}]:`, err);

  const safeMessage =
    config.env === 'production'
      ? `Đã xảy ra lỗi hệ thống không mong muốn. Mã tra cứu sự cố: ${traceId}.`
      : err.message || 'Đã xảy ra lỗi hệ thống không mong muốn.';

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: safeMessage,
      traceId,
    },
  });
};

export default errorHandler;
