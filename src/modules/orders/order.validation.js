import { z } from 'zod';
import mongoose from 'mongoose';
import { ORDER_TYPE } from '../../config/constants.js';

const objectId = z.string().refine((val) => mongoose.isValidObjectId(val), {
  message: 'Invalid ObjectId',
});

const orderItemInputSchema = z.object({
  productId: objectId,
  quantity: z.number().int().positive(),
  modifierIds: z.array(objectId).default([]),
});

export const createOrderSchema = z.object({
  orderType: z.enum(Object.values(ORDER_TYPE)),
  tableId: objectId.optional(),
  items: z.array(orderItemInputSchema).min(1),
  discount: z.number().min(0).default(0),
});

export const addItemsSchema = z.object({
  items: z.array(orderItemInputSchema).min(1),
});

export const updateItemQuantitySchema = z.object({
  quantity: z.number().int().min(0), // 0 removes the line
});

export const cancelOrderSchema = z.object({
  reason: z.string().min(2).max(255),
});

export const applyDiscountSchema = z.object({
  discount: z.number().min(0),
});


