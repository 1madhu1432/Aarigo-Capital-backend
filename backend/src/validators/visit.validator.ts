import { z } from 'zod';

export const createVisitSchema = z.object({
  body: z.object({
    customerId: z.string().min(1, 'Customer ID is required'),
    loanId: z.string().min(1, 'Loan ID is required'),
    visitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Visit date must be YYYY-MM-DD'),
    purpose: z.string().optional().nullable(),
    status: z.enum(['PLANNED', 'VISITED', 'PAID', 'PARTIALLY_PAID', 'NOT_PAID']).default('PLANNED'),
    notes: z.string().optional().nullable(),
    location: z.string().optional().nullable(),
    dueAmount: z.number().nonnegative().optional().nullable(),
    collected: z.number().nonnegative().optional().nullable(),
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
    status: z.enum(['PLANNED', 'VISITED', 'PAID', 'PARTIALLY_PAID', 'NOT_PAID']).optional(),
  }),
});

export type CreateVisitInput = z.infer<typeof createVisitSchema>['body'];
export type UpdateVisitInput = z.infer<typeof updateVisitSchema>['body'];
export type VisitQueryParams = z.infer<typeof visitQuerySchema>['query'];
