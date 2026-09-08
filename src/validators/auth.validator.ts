import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    username: z.string().min(1, 'Username, email or mobile is required').optional(),
    email: z.string().email('Invalid email format').optional(),
    mobile: z.string().min(10, 'Mobile number must be at least 10 digits').max(15).optional(),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  }).refine((data) => data.username || data.email || data.mobile, {
    message: 'Either username, email or mobile must be provided',
    path: ['username'],
  }),
});

export type LoginInput = z.infer<typeof loginSchema>['body'];
