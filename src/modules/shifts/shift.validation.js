import { z } from 'zod';

export const openShiftSchema = z.object({
  openingCash: z.number().min(0),
});

export const closeShiftSchema = z.object({
  closingCash: z.number().min(0),
  notes: z.string().max(500).optional(),
});


