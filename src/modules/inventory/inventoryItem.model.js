import mongoose from 'mongoose';
import { applyBaseFields } from '../../common/models/baseSchema.js';
import { tenantScopePlugin } from '../../common/plugins/tenantScope.plugin.js';
import { INVENTORY_UNIT } from '../../config/constants.js';
import './inventoryCategory.model.js';

const { Schema } = mongoose;

// Master data for a physical ingredient/packaging item — organization-wide,
// not branch-scoped. Actual quantities live in StockBalance, one doc per
// (branch, item), never here. See §26 of the design doc for why this was
// split from the original single-collection draft.
const inventoryItemSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, trim: true, default: null },
    categoryId: { type: Schema.Types.ObjectId, ref: 'InventoryCategory', default: null },
    unit: { type: String, enum: Object.values(INVENTORY_UNIT), required: true },
    averageCost: { type: Number, default: 0 }, // minor units per unit — weighted average, see stock.service.js
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

applyBaseFields(inventoryItemSchema, { branchScoped: false });
inventoryItemSchema.plugin(tenantScopePlugin);

inventoryItemSchema.index({ organizationId: 1, name: 1 });
inventoryItemSchema.index({ organizationId: 1, sku: 1 }, { sparse: true });

export const InventoryItem = mongoose.model('InventoryItem', inventoryItemSchema);


