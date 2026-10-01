import { z } from 'zod';
import mongoose from 'mongoose';

const objectId = z.string().refine((val) => mongoose.isValidObjectId(val), {
  message: 'Invalid ObjectId',
});

export const submitPaymentRequestSchema = z.object({
  planId: objectId,
  senderBkashNumber: z.string().min(6).max(20),
  transactionId: z.string().min(4).max(40),
});

export const reviewRequestSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  rejectionReason: z.string().min(2).max(255).optional(),
}).refine((data) => data.action !== 'REJECT' || !!data.rejectionReason, {
  message: 'rejectionReason is required when rejecting',
  path: ['rejectionReason'],
});


