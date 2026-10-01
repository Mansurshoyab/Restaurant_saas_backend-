import { z } from 'zod';
import mongoose from 'mongoose';

const objectId = z.string().refine((val) => mongoose.isValidObjectId(val), {
  message: 'Invalid ObjectId',
});

export const createProductSchema = z.object({
  name: z.string().min(1).max(120),
  sku: z.string().max(60).optional(),
  categoryId: objectId,
  price: z.number().min(0),
  tax: z.number().min(0).max(100).default(0),
  modifierGroupIds: z.array(objectId).default([]),
  availableBranches: z.array(objectId).default([]),
});

export const updateProductSchema = createProductSchema.partial();

export const listProductsQuerySchema = z.object({
  categoryId: objectId.optional(),
  branchId: objectId.optional(),
  includeInactive: z.enum(['true', 'false']).optional(),
  search: z.string().max(120).optional(),
});

