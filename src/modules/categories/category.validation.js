import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(2).max(80),
  sortOrder: z.number().int().default(0).optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(2).max(80).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

