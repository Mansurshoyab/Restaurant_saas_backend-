import mongoose from 'mongoose';
import { applyBaseFields } from '../../common/models/baseSchema.js';
import { tenantScopePlugin } from '../../common/plugins/tenantScope.plugin.js';

const { Schema } = mongoose;

// The single authoritative "how much do we have right now" record,
// one document per (branch, item). Never write to `quantity` directly
// from outside stock.service.js — always go through applyStockChange
// so every change is paired with a StockTransaction. See §17, §26.
const stockBalanceSchema = new Schema(
  {
    inventoryItemId: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true, index: true },
    quantity: { type: Number, default: 0 },
    minimumStock: { type: Number, default: 0 },
    reorderLevel: { type: Number, default: 0 },
    maximumStock: { type: Number, default: null },
  },
  { timestamps: true }
);

applyBaseFields(stockBalanceSchema, { branchScoped: true });
stockBalanceSchema.plugin(tenantScopePlugin);

stockBalanceSchema.index({ organizationId: 1, branchId: 1, inventoryItemId: 1 }, { unique: true });

export const StockBalance = mongoose.model('StockBalance', stockBalanceSchema);


