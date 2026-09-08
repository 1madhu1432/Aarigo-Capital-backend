import { z } from 'zod';

export const createLoanSchema = z.object({
  body: z.object({
    customerId: z.string().min(1, 'Customer ID is required'),
    loanProductId: z.string().optional().nullable(),
    principalAmount: z.number().positive('Principal amount must be positive'),
    interestRate: z.number().positive('Interest rate must be positive'),
    interestType: z.enum(['FLAT', 'REDUCING']),
    tenure: z.number().int().positive('Tenure must be a positive integer'),
    frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
    processingFee: z.number().nonnegative('Processing fee cannot be negative').default(0),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD'),
    firstDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'First due date must be YYYY-MM-DD').optional(),
    purpose: z.string().optional().nullable(),
    disbursementMethod: z.string().optional().nullable(),
    bankTransactionId: z.string().optional().nullable(),
  }),
});

export const updateLoanSchema = z.object({
  body: z.object({
    purpose: z.string().optional().nullable(),
    disbursementMethod: z.string().optional().nullable(),
    bankTransactionId: z.string().optional().nullable(),
    status: z.enum(['PENDING', 'ACTIVE', 'OVERDUE', 'CLOSED', 'CANCELLED']).optional(),
  }),
});

export const earlyClosureSchema = z.object({
  body: z.object({
    closureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Closure date must be YYYY-MM-DD'),
    foreclosureChargePercent: z.number().min(0).max(100).default(2),
    waiveLateFee: z.boolean().default(false),
    notes: z.string().optional().nullable(),
  }),
});

export const loanQuerySchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).optional().default('20'),
    customerId: z.string().optional(),
    status: z.enum(['PENDING', 'ACTIVE', 'OVERDUE', 'CLOSED', 'CANCELLED']).optional(),
    search: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).optional(),
  }),
});

export type CreateLoanInput = z.infer<typeof createLoanSchema>['body'];
export type UpdateLoanInput = z.infer<typeof updateLoanSchema>['body'];
export type EarlyClosureInput = z.infer<typeof earlyClosureSchema>['body'];
export type LoanQueryParams = z.infer<typeof loanQuerySchema>['query'];
