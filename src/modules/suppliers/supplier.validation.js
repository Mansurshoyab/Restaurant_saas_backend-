import { z } from 'zod';

export const createSupplierSchema = z.object({
  name: z.string().min(2).max(120),
  contactPerson: z.string().max(120).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional(),
  address: z.string().max(255).optional(),
  paymentTerms: z.string().max(80).optional(),
  notes: z.string().max(500).optional(),
});

export const updateSupplierSchema = createSupplierSchema.partial();


