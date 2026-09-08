import { z } from 'zod';

const loanProductBodySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(200),
  description: z.string().optional().nullable(),
  minAmount: z.number().positive('Min amount must be positive'),
  maxAmount: z.number().positive('Max amount must be positive'),
  interestRate: z.number().positive('Interest rate must be positive'),
  interestType: z.enum(['FLAT', 'REDUCING']),
  defaultTenure: z.number().int().positive('Default tenure must be a positive integer'),
  repaymentFrequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
  processingFee: z.number().nonnegative('Processing fee cannot be negative').default(0),
  isActive: z.boolean().default(true),
});

export const createLoanProductSchema = z.object({
  body: loanProductBodySchema.refine((data) => data.maxAmount >= data.minAmount, {
    message: 'Max amount must be greater than or equal to min amount',
    path: ['maxAmount'],
  }),
});

export const updateLoanProductSchema = z.object({
  body: loanProductBodySchema.partial(),
});

export type CreateLoanProductInput = z.infer<typeof createLoanProductSchema>['body'];
export type UpdateLoanProductInput = z.infer<typeof updateLoanProductSchema>['body'];
