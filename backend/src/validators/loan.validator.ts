import { z } from 'zod';

export const createLoanSchema = z.object({
  body: z.object({
    customerId: z.string().min(1, 'Customer ID is required'),
    loanProductId: z.string().optional().nullable(),
    productId: z.string().optional().nullable(),
    principalAmount: z.number().positive().optional(),
    principal: z.number().positive().optional(),
    interestRate: z.number().positive().optional(),
    annualRate: z.number().positive().optional(),
    interestType: z.preprocess((val) => {
      const s = String(val || '').toUpperCase();
      return s.includes('REDUC') ? 'REDUCING' : 'FLAT';
    }, z.enum(['FLAT', 'REDUCING'])).default('FLAT'),
    interestMethod: z.string().optional().nullable(),
    tenure: z.number().int().positive('Tenure must be a positive integer'),
    frequency: z.preprocess((val) => {
      const s = String(val || 'MONTHLY').toUpperCase();
      if (s === 'DAILY' || s === 'WEEKLY' || s === 'MONTHLY') return s;
      return 'MONTHLY';
    }, z.enum(['DAILY', 'WEEKLY', 'MONTHLY'])).default('MONTHLY'),
    processingFee: z.number().nonnegative().optional().default(0),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD'),
    firstDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'First due date must be YYYY-MM-DD').optional(),
    firstEmiDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'First due date must be YYYY-MM-DD').optional(),
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
