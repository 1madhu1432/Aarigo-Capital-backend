export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly errors?: unknown;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    errors?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, errors?: unknown): ApiError {
    return new ApiError(message, 400, 'BAD_REQUEST', errors);
  }

  static unauthorized(message = 'Unauthorized'): ApiError {
    return new ApiError(message, 401, 'UNAUTHORIZED');
  }

  static forbidden(message = 'Forbidden'): ApiError {
    return new ApiError(message, 403, 'FORBIDDEN');
  }

  static notFound(resource: string): ApiError {
    return new ApiError(`${resource} not found`, 404, 'NOT_FOUND');
  }

  static conflict(message: string): ApiError {
    return new ApiError(message, 409, 'CONFLICT');
  }

  static unprocessable(message: string, errors?: unknown): ApiError {
    return new ApiError(message, 422, 'UNPROCESSABLE', errors);
  }

  static internal(message = 'Internal server error'): ApiError {
    return new ApiError(message, 500, 'INTERNAL_ERROR');
  }
}
