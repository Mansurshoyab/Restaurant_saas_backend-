import { z } from 'zod';
import mongoose from 'mongoose';
import { SUBSCRIPTION_STATUS } from '../../config/constants.js';

const objectId = z.string().refine((val) => mongoose.isValidObjectId(val), {
  message: 'Invalid ObjectId',
});

export const createPlanSchema = z.object({
  name: z.string().min(2).max(80),
  key: z.string().min(2).max(40).regex(/^[A-Z0-9_]+$/i).transform((v) => v.toUpperCase()),
  billingCycle: z.enum(['MONTHLY', 'YEARLY']),
  price: z.number().min(0),
  limits: z
    .object({
      maxBranches: z.number().int().positive().nullable().optional(),
      maxUsers: z.number().int().positive().nullable().optional(),
      maxProducts: z.number().int().positive().nullable().optional(),
    })
    .optional(),
  features: z.array(z.string()).default([]),
  sortOrder: z.number().int().default(0).optional(),
});

export const updatePlanSchema = createPlanSchema.partial().omit({ key: true });

export const verifyPaymentSchema = z.object({
  organizationId: objectId,
  planId: objectId,
  amount: z.number().min(0),
  paymentReference: z.string().min(2).max(120), // bKash TrxID
  periodDays: z.number().int().positive().default(30),
  notes: z.string().max(500).optional(),
});

export const updateOrgStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'CLOSED']),
  reason: z.string().min(2).max(255),
});

export const updateSubscriptionStatusSchema = z.object({
  status: z.enum(Object.values(SUBSCRIPTION_STATUS)),
  reason: z.string().min(2).max(255),
});

export const listOrganizationsQuerySchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'CLOSED']).optional(),
  subscriptionStatus: z.enum(Object.values(SUBSCRIPTION_STATUS)).optional(),
  search: z.string().max(120).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

export const reviewRequestSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  rejectionReason: z.string().min(2).max(255).optional(),
}).refine((data) => data.action !== 'REJECT' || !!data.rejectionReason, {
  message: 'rejectionReason is required when rejecting',
  path: ['rejectionReason'],
});

