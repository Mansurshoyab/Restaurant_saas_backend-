import { z } from 'zod';
import mongoose from 'mongoose';

const objectId = z.string().refine((val) => mongoose.isValidObjectId(val), {
  message: 'Invalid ObjectId',
});

export const wasteSchema = z.object({
  inventoryItemId: objectId,
  quantity: z.number().positive(),
  reason: z.string().min(2).max(255),
});

export const adjustmentSchema = z.object({
  inventoryItemId: objectId,
  countedQuantity: z.number().min(0),
  reason: z.string().min(2).max(255),
});

export const transferSchema = z.object({
  inventoryItemId: objectId,
  toBranchId: objectId,
  quantity: z.number().positive(),
});

export const reorderLevelsSchema = z.object({
  minimumStock: z.number().min(0).optional(),
  reorderLevel: z.number().min(0).optional(),
  maximumStock: z.number().min(0).nullable().optional(),
});

export const listTransactionsQuerySchema = z.object({
  inventoryItemId: objectId.optional(),
  type: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});


