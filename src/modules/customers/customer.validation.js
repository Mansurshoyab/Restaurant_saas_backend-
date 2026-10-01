import { z } from 'zod';

export const upsertCustomerSchema = z.object({
  name: z.string().max(120).optional(),
  phone: z.string().max(20).optional(),
  address: z.string().max(255).optional(),
  notes: z.string().max(500).optional(),
});


