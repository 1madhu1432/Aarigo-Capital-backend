import { z } from 'zod';

const normalizeVisitStatus = (val: unknown) => {
  if (typeof val !== 'string') return 'PLANNED';
  const upper = val.toUpperCase().replace(/\s+/g, '_');
  if (upper === 'PARTIALLY_PAID' || upper === 'PARTIAL') return 'PARTIALLY_PAID';
  if (upper === 'NOT_PAID' || upper === 'NOTPAID' || upper === 'UNPAID') return 'NOT_PAID';
  if (upper === 'PAID' || upper === 'COLLECTED') return 'PAID';
  if (upper === 'VISITED' || upper === 'COMPLETED') return 'VISITED';
  if (upper === 'PLANNED' || upper === 'PENDING') return 'PLANNED';
  return 'PLANNED';
};

export const createVisitSchema = z.object({
  body: z.object({
    customerId: z.string().min(1, 'Customer ID is required'),
    loanId: z.string().optional().nullable(),
    visitDate: z.preprocess((val) => {
      if (!val) return new Date().toISOString().slice(0, 10);
      if (typeof val === 'string') return val.slice(0, 10);
      return val;
    }, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Visit date must be YYYY-MM-DD')).default(() => new Date().toISOString().slice(0, 10)),
    purpose: z.string().optional().nullable(),
    status: z.preprocess(normalizeVisitStatus, z.enum(['PLANNED', 'VISITED', 'PAID', 'PARTIALLY_PAID', 'NOT_PAID'])).default('PLANNED'),
    notes: z.string().optional().nullable(),
    location: z.string().optional().nullable(),
    dueAmount: z.preprocess((v) => (typeof v === 'string' ? parseFloat(v) : v), z.number().nonnegative().optional().nullable()),
    collected: z.preprocess((v) => (typeof v === 'string' ? parseFloat(v) : v), z.number().nonnegative().optional().nullable()),
    nextVisit: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Next visit must be YYYY-MM-DD').optional().nullable(),
  }),
});

export const updateVisitSchema = z.object({
  body: createVisitSchema.shape.body.partial(),
});

export const visitQuerySchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).optional().default('20'),
    customerId: z.string().optional(),
    loanId: z.string().optional(),
    visitDate: z.string().optional(),
    status: z.preprocess(normalizeVisitStatus, z.enum(['PLANNED', 'VISITED', 'PAID', 'PARTIALLY_PAID', 'NOT_PAID'])).optional(),
  }),
});

export type CreateVisitInput = z.infer<typeof createVisitSchema>['body'];
export type UpdateVisitInput = z.infer<typeof updateVisitSchema>['body'];
export type VisitQueryParams = z.infer<typeof visitQuerySchema>['query'];
