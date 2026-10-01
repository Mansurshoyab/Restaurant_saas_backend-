import mongoose from 'mongoose';
import { applyBaseFields } from '../../common/models/baseSchema.js';
import { tenantScopePlugin } from '../../common/plugins/tenantScope.plugin.js';

const { Schema } = mongoose;

const receiptLineSchema = new Schema(
  {
    inventoryItemId: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    quantity: { type: Number, required: true, min: 0 },
    unitCost: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

// One immutable record per receiving event — supports partial receiving
// (§15) by allowing multiple GoodsReceipt docs against one PurchaseOrder.
const goodsReceiptSchema = new Schema(
  {
    purchaseOrderId: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder', required: true, index: true },
    lines: { type: [receiptLineSchema], default: [] },
    receivedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receivedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

applyBaseFields(goodsReceiptSchema, { branchScoped: true });
goodsReceiptSchema.plugin(tenantScopePlugin);

export const GoodsReceipt = mongoose.model('GoodsReceipt', goodsReceiptSchema);


