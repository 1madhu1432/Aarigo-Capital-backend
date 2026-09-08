import { z } from 'zod';

export const createPaymentSchema = z.object({
  body: z.object({
    loanId: z.string().min(1, 'Loan ID is required'),
    amount: z.number().positive('Payment amount must be greater than zero'),
    paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Payment date must be YYYY-MM-DD'),
    paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'UPI', 'CHEQUE', 'OTHER']),
    referenceNumber: z.string().max(200).optional().nullable(),
    notes: z.string().optional().nullable(),
    isEarlyClosure: z.boolean().default(false),
    foreclosureChargePercent: z.number().min(0).max(100).optional(),
  }),
});

export const paymentQuerySchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).optional().default('20'),
    loanId: z.string().optional(),
    customerId: z.string().optional(),
    paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'UPI', 'CHEQUE', 'OTHER']).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    search: z.string().optional(),
  }),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>['body'];
export type PaymentQueryParams = z.infer<typeof paymentQuerySchema>['query'];
