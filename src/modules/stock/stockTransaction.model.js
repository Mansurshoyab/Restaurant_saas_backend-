import mongoose from 'mongoose';
import { applyBaseFields } from '../../common/models/baseSchema.js';
import { tenantScopePlugin } from '../../common/plugins/tenantScope.plugin.js';
import { STOCK_TX_TYPE } from '../../config/constants.js';

const { Schema } = mongoose;

// Immutable ledger entry — never updated or deleted after creation.
// Current balance (StockBalance.quantity) must always be reconstructable
// by summing these. See §17 of the design doc.
const stockTransactionSchema = new Schema(
  {
    inventoryItemId: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true, index: true },
    type: { type: String, enum: Object.values(STOCK_TX_TYPE), required: true },
    quantity: { type: Number, required: true }, // signed: negative = decrease, positive = increase
    unitCost: { type: Number, default: null }, // cost at time of transaction, for weighted-average recalculation
    reference: { type: String, default: null }, // e.g. "Order #10025", "PO #45"
    reason: { type: String, default: null }, // free text, required for WASTE/STOCK_ADJUSTMENT at the service layer
    relatedTransferId: { type: Schema.Types.ObjectId, ref: 'StockTransaction', default: null }, // links TRANSFER_OUT <-> TRANSFER_IN
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

applyBaseFields(stockTransactionSchema, { branchScoped: true });
stockTransactionSchema.plugin(tenantScopePlugin);

stockTransactionSchema.index({ organizationId: 1, branchId: 1, inventoryItemId: 1, createdAt: -1 });

export const StockTransaction = mongoose.model('StockTransaction', stockTransactionSchema);


    