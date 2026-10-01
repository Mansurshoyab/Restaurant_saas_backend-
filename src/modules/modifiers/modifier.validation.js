import { z } from 'zod';

export const createModifierGroupSchema = z.object({
  name: z.string().min(2).max(80),
  selectionType: z.enum(['SINGLE', 'MULTIPLE']).default('MULTIPLE'),
  required: z.boolean().default(false),
  minSelect: z.number().int().min(0).default(0),
  maxSelect: z.number().int().min(1).nullable().default(null),
});

export const updateModifierGroupSchema = createModifierGroupSchema.partial();

export const createModifierSchema = z.object({
  name: z.string().min(1).max(80),
  price: z.number().min(0).default(0),
  sortOrder: z.number().int().default(0).optional(),
});

export const updateModifierSchema = createModifierSchema.partial();

