import { Response } from 'express';

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  message: string;
  pagination?: any;
  meta?: any;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  code: string;
  errors?: unknown;
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode = 200,
  metaOrPagination?: any
): Response {
  const body: ApiSuccessResponse<T> = { success: true, data, message };
  if (metaOrPagination) {
    if (metaOrPagination.totalPages !== undefined) {
      body.pagination = metaOrPagination;
    } else {
      body.meta = metaOrPagination;
    }
  }
  return res.status(statusCode).json(body);
}

export function sendCreated<T>(res: Response, data: T, message = 'Created'): Response {
  return sendSuccess(res, data, message, 201);
}

export function sendError(
  res: Response,
  message: string,
  code: string,
  statusCode = 500,
  errors?: unknown
): Response {
  const body: ApiErrorResponse = { success: false, message, code };
  if (errors !== undefined) body.errors = errors;
  return res.status(statusCode).json(body);
}
