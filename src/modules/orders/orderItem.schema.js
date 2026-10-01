import mongoose from 'mongoose';

const { Schema } = mongoose;

const orderItemModifierSchema = new Schema(
  {
    modifierId: { type: Schema.Types.ObjectId, ref: 'Modifier', required: true },
    name: { type: String, required: true }, // snapshot — see §26
    price: { type: Number, required: true },
  },
  { _id: false }
);

// Immutable historical snapshot — never resolved from live MenuProduct
// after creation. If the price changes tomorrow, this record still
// reflects what the customer actually paid. See §26 of the design doc.
export const orderItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'MenuProduct', required: true },
    productName: { type: String, required: true },
    unitPrice: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    modifiers: { type: [orderItemModifierSchema], default: [] },
    recipeVersion: { type: Number, default: null }, // pins food-cost history — §13, §26
    subtotal: { type: Number, required: true },
  },
  { _id: true }
);

