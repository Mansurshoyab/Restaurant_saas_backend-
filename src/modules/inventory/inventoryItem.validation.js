import { z } from 'zod';
import mongoose from 'mongoose';
import { INVENTORY_UNIT } from '../../config/constants.js';

const objectId = z.string().refine((val) => mongoose.isValidObjectId(val), {
  message: 'Invalid ObjectId',
});

export const createInventoryItemSchema = z.object({
  name: z.string().min(1).max(120),
  sku: z.string().max(60).optional(),
  categoryId: objectId.optional(),
  unit: z.enum(Object.values(INVENTORY_UNIT)),
});

export const updateInventoryItemSchema = createInventoryItemSchema.partial();

