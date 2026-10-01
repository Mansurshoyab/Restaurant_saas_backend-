import mongoose from 'mongoose';
import { applyBaseFields } from '../../common/models/baseSchema.js';
import { tenantScopePlugin } from '../../common/plugins/tenantScope.plugin.js';
import { PURCHASE_STATUS } from '../../config/constants.js';

const { Schema } = mongoose;

const purchaseOrderItemSchema = new Schema(
  {
    inventoryItemId: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    orderedQuantity: { type: Number, required: true, min: 0 },
    receivedQuantity: { type: Number, default: 0 }, // running total across partial receipts
    unitCost: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const purchaseOrderSchema = new Schema(
  {
    poNumber: { type: String, required: true },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
    items: { type: [purchaseOrderItemSchema], default: [] },
    status: {
      type: String,
      enum: Object.values(PURCHASE_STATUS),
      default: PURCHASE_STATUS.DRAFT,
      index: true,
    },
    totalAmount: { type: Number, default: 0 }, // minor units, sum(orderedQuantity * unitCost)
    submittedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

applyBaseFields(purchaseOrderSchema, { branchScoped: true });
purchaseOrderSchema.plugin(tenantScopePlugin);

purchaseOrderSchema.index({ organizationId: 1, branchId: 1, poNumber: 1 }, { unique: true });

export const PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema);


