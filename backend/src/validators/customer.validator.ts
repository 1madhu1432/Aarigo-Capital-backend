import { z } from 'zod';

export const createCustomerSchema = z.object({
  body: z.object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
    mobile: z.string().regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian mobile number'),
    alternateMobile: z.string().regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit mobile number').optional().nullable(),
    email: z.string().email('Invalid email address').optional().nullable(),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be YYYY-MM-DD').optional().nullable(),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional().nullable(),
    address: z.string().min(3, 'Address is required').max(500),
    city: z.string().min(2, 'City is required').max(100),
    state: z.string().min(2, 'State is required').max(100),
    pincode: z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
    occupation: z.string().max(100).optional().nullable(),
    monthlyIncome: z.number().nonnegative().optional().nullable(),
    kycType: z.enum(['AADHAAR', 'PAN', 'VOTER_ID', 'DRIVING_LICENCE']).optional().nullable(),
    kycNumber: z.string().max(50).optional().nullable(),
    kycStatus: z.enum(['PENDING', 'VERIFIED', 'REJECTED']).default('PENDING').optional(),
    guarantorName: z.string().max(100).optional().nullable(),
    guarantorRelationship: z.string().max(100).optional().nullable(),
    guarantorMobile: z.string().regex(/^[6-9]\d{9}$/, 'Invalid guarantor mobile').optional().nullable(),
    guarantorAddress: z.string().max(500).optional().nullable(),
    notes: z.string().optional().nullable(),
  }),
});

export const updateCustomerSchema = z.object({
  body: createCustomerSchema.shape.body.partial().extend({
    status: z.enum(['ACTIVE', 'INACTIVE', 'BLOCKED']).optional(),
  }),
});

export const customerQuerySchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).optional().default('20'),
    search: z.string().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'BLOCKED']).optional(),
    kycStatus: z.enum(['PENDING', 'VERIFIED', 'REJECTED']).optional(),
    city: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  }),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>['body'];
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>['body'];
export type CustomerQueryParams = z.infer<typeof customerQuerySchema>['query'];
