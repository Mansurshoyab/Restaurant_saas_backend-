import { z } from 'zod';
import mongoose from 'mongoose';

const objectId = z.string().refine((val) => mongoose.isValidObjectId(val), {
  message: 'Invalid ObjectId',
});

export const createDiningAreaSchema = z.object({
  name: z.string().min(1).max(80),
});

export const createTableSchema = z.object({
  diningAreaId: objectId.optional(),
  label: z.string().min(1).max(20),
  seats: z.number().int().positive().default(4),
});

export const updateTableSchema = createTableSchema.partial();


