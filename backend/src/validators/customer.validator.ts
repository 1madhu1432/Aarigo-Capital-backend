import { z } from 'zod';

const emptyToNull = (val: unknown) => {
  if (val === undefined || val === null) return null;
  if (typeof val === 'string' && val.trim() === '') return null;
  return val;
};

export const createCustomerSchema = z.object({
  body: z.object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
    mobile: z.string().regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian mobile number'),
    alternateMobile: z.preprocess(emptyToNull, z.string().regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit mobile number').nullable().optional()),
    email: z.preprocess(emptyToNull, z.string().email('Invalid email address').nullable().optional()),
    dateOfBirth: z.preprocess(emptyToNull, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be YYYY-MM-DD').nullable().optional()),
    gender: z.preprocess((val) => {
      const s = String(val || '').toUpperCase();
      if (s === 'FEMALE') return 'FEMALE';
      if (s === 'OTHER') return 'OTHER';
      return 'MALE';
    }, z.enum(['MALE', 'FEMALE', 'OTHER'])).optional().default('MALE'),
    address: z.preprocess((val) => {
      const s = String(val || '').trim();
      return s.length >= 3 ? s : 'Main Address, City';
    }, z.string().min(3).max(500)),
    city: z.preprocess((val) => String(val || 'Pune').trim() || 'Pune', z.string().min(1).max(100)),
    state: z.preprocess((val) => String(val || 'Maharashtra').trim() || 'Maharashtra', z.string().min(1).max(100)),
    pincode: z.preprocess((val) => {
      const s = String(val || '').replace(/\D/g, '');
      return s.length === 6 ? s : '411001';
    }, z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits')),
    occupation: z.preprocess(emptyToNull, z.string().max(100).nullable().optional()),
    monthlyIncome: z.preprocess((val) => {
      if (val === undefined || val === null || val === '') return null;
      const n = Number(val);
      return isNaN(n) ? null : n;
    }, z.number().nonnegative().nullable().optional()),
    kycType: z.preprocess((val) => {
      const s = String(val || '').toUpperCase().replace(/\s+/g, '_');
      if (s.includes('PAN')) return 'PAN';
      if (s.includes('VOTER')) return 'VOTER_ID';
      if (s.includes('DRIV')) return 'DRIVING_LICENCE';
      return 'AADHAAR';
    }, z.enum(['AADHAAR', 'PAN', 'VOTER_ID', 'DRIVING_LICENCE'])).optional().default('AADHAAR'),
    kycNumber: z.preprocess(emptyToNull, z.string().max(50).nullable().optional()),
    kycStatus: z.enum(['PENDING', 'VERIFIED', 'REJECTED']).default('PENDING').optional(),
    guarantorName: z.preprocess(emptyToNull, z.string().max(100).nullable().optional()),
    guarantorRelationship: z.preprocess(emptyToNull, z.string().max(100).nullable().optional()),
    guarantorMobile: z.preprocess(emptyToNull, z.string().regex(/^[6-9]\d{9}$/, 'Invalid guarantor mobile').nullable().optional()),
    guarantorAddress: z.preprocess(emptyToNull, z.string().max(500).nullable().optional()),
    notes: z.preprocess(emptyToNull, z.string().nullable().optional()),
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
