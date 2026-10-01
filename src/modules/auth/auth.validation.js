import { z } from 'zod';

export const registerOwnerSchema = z.object({
  restaurantName: z.string().min(2).max(120),
  ownerName: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().min(6).max(20).optional(),
  password: z.string().min(8).max(72),
});

/**
 * Accepts either email or phone as the identifier. Staff created by an
 * OrgAdmin often have only a phone number, so email-only login would
 * lock them out of the password path entirely.
 */
export const loginSchema = z
  .object({
    identifier: z.string().min(3).max(120).optional(), // email or phone
    email: z.string().email().optional(),              // kept for backward compat
    phone: z.string().min(6).max(20).optional(),
    password: z.string().min(1),
  })
  .refine((data) => data.identifier || data.email || data.phone, {
    message: 'Provide identifier (email or phone), or email, or phone',
    path: ['identifier'],
  });

export const requestOtpSchema = z.object({
  phone: z.string().min(6).max(20),
});

export const verifyOtpSchema = z.object({
  phone: z.string().min(6).max(20),
  code: z.string().length(6),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(72),
});


