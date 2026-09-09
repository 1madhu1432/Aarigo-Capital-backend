import { z } from 'zod';

export const createCollectionSchema = z.object({
  body: z.object({
    loanId: z.string().min(1, 'Loan ID is required'),
    customerId: z.string().min(1, 'Customer ID is required'),
    amount: z.number().positive('Collection amount must be positive'),
    collectionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Collection date must be YYYY-MM-DD'),
    paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'UPI', 'CHEQUE', 'OTHER']),
    referenceNumber: z.string().max(200).optional().nullable(),
    notes: z.string().optional().nullable(),
  }),
});

export const collectionQuerySchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).optional().default('20'),
    loanId: z.string().optional(),
    customerId: z.string().optional(),
    collectionDate: z.string().optional(),
    paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'UPI', 'CHEQUE', 'OTHER']).optional(),
  }),
});

export type CreateCollectionInput = z.infer<typeof createCollectionSchema>['body'];
export type CollectionQueryParams = z.infer<typeof collectionQuerySchema>['query'];
