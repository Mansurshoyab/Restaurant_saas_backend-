import { z } from 'zod';
import { PAYMENT_METHOD } from '../../config/constants.js';

export const createExpenseSchema = z.object({
  category: z.string().min(1).max(100),
  description: z.string().max(255).optional(),
  amount: z.number().positive(),
  method: z.enum(Object.values(PAYMENT_METHOD)).default(PAYMENT_METHOD.CASH),
  expenseDate: z.string().datetime().optional(),
});



export const createExpenseCategorySchema = z.object({
  name: z.string().min(1).max(100),
});
