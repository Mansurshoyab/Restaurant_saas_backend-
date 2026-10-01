import { z } from 'zod';

export const createBranchSchema = z.object({
  name: z.string().min(2).max(120),
  address: z.string().max(255).optional(),
  phone: z.string().max(20).optional(),
});

export const updateBranchSchema = createBranchSchema.partial();


