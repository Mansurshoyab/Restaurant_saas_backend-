import { z } from 'zod';
import mongoose from 'mongoose';

const objectId = z.string().refine((val) => mongoose.isValidObjectId(val), {
  message: 'Invalid ObjectId',
});

const poItemSchema = z.object({
  inventoryItemId: objectId,
  orderedQuantity: z.number().positive(),
  unitCost: z.number().min(0),
});

export const createPurchaseOrderSchema = z.object({
  supplierId: objectId,
  items: z.array(poItemSchema).min(1),
});

export const receiveGoodsSchema = z.object({
  lines: z
    .array(
      z.object({
        inventoryItemId: objectId,
        quantity: z.number().positive(),
        unitCost: z.number().min(0).optional(), // defaults to PO's unitCost if omitted
      })
    )
    .min(1),
});


