/**
 * Core Domain Errors Infrastructure
 * Provides structured, typed error classes across CyberRig domain modules.
 * Aligned with Task BE-05 specification.
 */

export abstract class DomainError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(message: string, statusCode = 500, code = 'DOMAIN_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export class IncompatibleHardwareError extends DomainError {
  constructor(
    message = 'Phát hiện linh kiện phần cứng không tương thích trong cấu hình.',
    statusCode = 422,
    code = 'HARDWARE_INCOMPATIBLE'
  ) {
    super(message, statusCode, code);
  }
}

export class InvalidStateTransitionError extends DomainError {
  constructor(
    message: string,
    statusCode = 400,
    code = 'INVALID_STATE_TRANSITION'
  ) {
    super(message, statusCode, code);
  }
}

export class EntityNotFoundError extends DomainError {
  constructor(
    message: string,
    statusCode = 404,
    code = 'ENTITY_NOT_FOUND'
  ) {
    super(message, statusCode, code);
  }
}

export { EntityNotFoundError as NotFoundError };

export class InsufficientStockError extends DomainError {
  constructor(
    message: string,
    statusCode = 400,
    code = 'INSUFFICIENT_STOCK'
  ) {
    super(message, statusCode, code);
  }
}

export class OutOfStockError extends DomainError {
  constructor(
    message = 'Linh kiện không đủ số lượng tồn kho',
    statusCode = 400,
    code = 'OUT_OF_STOCK'
  ) {
    super(message, statusCode, code);
  }
}

export class ValidationError extends DomainError {
  constructor(
    message: string,
    statusCode = 400,
    code = 'VALIDATION_ERROR'
  ) {
    super(message, statusCode, code);
  }
}

export class UnauthorizedError extends DomainError {
  constructor(
    message = 'Vui lòng đăng nhập để tiếp tục.',
    statusCode = 401,
    code = 'UNAUTHORIZED'
  ) {
    super(message, statusCode, code);
  }
}

export class ForbiddenError extends DomainError {
  constructor(
    message = 'Bạn không có quyền thực hiện hành động này.',
    statusCode = 403,
    code = 'FORBIDDEN'
  ) {
    super(message, statusCode, code);
  }
}

export class ConflictError extends DomainError {
  constructor(
    message = 'Dữ liệu bị trùng lặp hoặc xung đột.',
    statusCode = 409,
    code = 'CONFLICT'
  ) {
    super(message, statusCode, code);
  }
}


