import { z } from 'zod';

export const createDailyClosingSchema = z.object({
  body: z.object({
    closingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Closing date must be YYYY-MM-DD'),
    notes: z.string().optional().nullable(),
  }),
});

export const dailyClosingQuerySchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).optional().default('30'),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    status: z.enum(['OPEN', 'CLOSED', 'AUDITED']).optional(),
  }),
});

export type CreateDailyClosingInput = z.infer<typeof createDailyClosingSchema>['body'];
export type DailyClosingQueryParams = z.infer<typeof dailyClosingQuerySchema>['query'];
