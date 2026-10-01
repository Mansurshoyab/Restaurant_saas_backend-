import mongoose from 'mongoose';
import { applyBaseFields } from '../../common/models/baseSchema.js';
import { tenantScopePlugin } from '../../common/plugins/tenantScope.plugin.js';

const { Schema } = mongoose;

const inventoryCategorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true }, // e.g. "Raw Ingredients", "Packaging", "Beverages"
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

applyBaseFields(inventoryCategorySchema, { branchScoped: false });
inventoryCategorySchema.plugin(tenantScopePlugin);

inventoryCategorySchema.index({ organizationId: 1, name: 1 }, { unique: true });

export const InventoryCategory = mongoose.model('InventoryCategory', inventoryCategorySchema);



