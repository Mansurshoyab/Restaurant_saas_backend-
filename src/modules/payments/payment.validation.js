import { z } from 'zod';
import mongoose from 'mongoose';
import { PAYMENT_METHOD } from '../../config/constants.js';

const objectId = z.string().refine((val) => mongoose.isValidObjectId(val), {
  message: 'Invalid ObjectId',
});

const paymentLineSchema = z.object({
  method: z.enum(Object.values(PAYMENT_METHOD)),
  amount: z.number().positive(),
  amountReceived: z.number().positive().optional(), // CASH only — for change calculation
  transactionId: z.string().optional(),
  reference: z.string().optional(),
});

export const payOrderSchema = z.object({
  orderId: objectId,
  payments: z.array(paymentLineSchema).min(1), // supports split payments — §11.1
});

export const refundSchema = z.object({
  orderId: objectId,
  amount: z.number().positive(),
  method: z.string().min(1),
  reason: z.string().min(2).max(255),
});


