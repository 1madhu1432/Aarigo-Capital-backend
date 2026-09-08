export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
  take: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export function parsePagination(
  rawPageOrQuery?: any,
  rawLimit?: unknown,
  maxLimit = 100
): PaginationParams {
  let p: any = rawPageOrQuery;
  let l: any = rawLimit;

  if (typeof rawPageOrQuery === 'object' && rawPageOrQuery !== null) {
    p = rawPageOrQuery.page;
    l = rawPageOrQuery.limit;
  }

  const page = Math.max(1, parseInt(String(p ?? '1'), 10) || 1);
  const limit = Math.min(
    maxLimit,
    Math.max(1, parseInt(String(l ?? '20'), 10) || 20)
  );
  const skip = (page - 1) * limit;
  return { page, limit, skip, take: limit };
}

export function buildPaginationMeta(
  total: number,
  pageOrParams: number | { page: number; limit: number },
  maybeLimit?: number
): PaginationMeta {
  let page = 1;
  let limit = 20;

  if (typeof pageOrParams === 'object' && pageOrParams !== null) {
    page = pageOrParams.page;
    limit = pageOrParams.limit;
  } else {
    page = Number(pageOrParams) || 1;
    limit = Number(maybeLimit) || 20;
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}
