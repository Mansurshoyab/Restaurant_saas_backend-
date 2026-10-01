import { z } from 'zod';
import mongoose from 'mongoose';

const objectId = z.string().refine((val) => mongoose.isValidObjectId(val), {
  message: 'Invalid ObjectId',
});

const recipeItemSchema = z.object({
  inventoryItemId: objectId,
  quantity: z.number().positive(),
  unit: z.string().min(1),
});

export const upsertRecipeSchema = z.object({
  productId: objectId,
  items: z.array(recipeItemSchema).min(1),
});


