import { z } from 'zod';
import { PAYMENT_METHOD } from '../../config/constants.js';

export const updateSettingsSchema = z.object({
  name: z.string().max(255).optional(),
  logo: z.string().optional(),
  phoneNumber: z.string().max(50).optional(),
  currency: z.string().length(3).optional(),
  taxRatePercent: z.number().min(0).max(100).optional(),
  taxInclusive: z.boolean().optional(),
  receiptHeader: z.string().max(255).optional(),
  receiptFooter: z.string().max(255).optional(),
  paymentMethodsEnabled: z.array(z.enum(Object.values(PAYMENT_METHOD))).optional(),
  businessHours: z
    .object({
      open: z.string().regex(/^\d{2}:\d{2}$/),
      close: z.string().regex(/^\d{2}:\d{2}$/),
    })
    .optional(),
  timezone: z.string().optional(),
});


