import { z } from 'zod';

export const createRouteSchema = z.object({
  body: z.object({
    routeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Route date must be YYYY-MM-DD'),
    customerId: z.string().min(1, 'Customer ID is required'),
    loanId: z.string().optional().nullable(),
    sequence: z.number().int().nonnegative().default(0),
    visitStatus: z.enum(['PLANNED', 'VISITED', 'PAID', 'PARTIALLY_PAID', 'NOT_PAID']).default('PLANNED'),
    collectionStatus: z.string().default('PENDING'),
    amountDue: z.number().nonnegative().optional().nullable(),
    amountCollected: z.number().nonnegative().optional().nullable(),
    notes: z.string().optional().nullable(),
  }),
});

export const updateRouteSchema = z.object({
  body: createRouteSchema.shape.body.partial(),
});

export const routeQuerySchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).optional().default('50'),
    routeDate: z.string().optional(),
    customerId: z.string().optional(),
    visitStatus: z.enum(['PLANNED', 'VISITED', 'PAID', 'PARTIALLY_PAID', 'NOT_PAID']).optional(),
  }),
});

export type CreateRouteInput = z.infer<typeof createRouteSchema>['body'];
export type UpdateRouteInput = z.infer<typeof updateRouteSchema>['body'];
export type RouteQueryParams = z.infer<typeof routeQuerySchema>['query'];
