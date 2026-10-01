import mongoose from 'mongoose';
import { applyBaseFields } from '../../common/models/baseSchema.js';
import { tenantScopePlugin } from '../../common/plugins/tenantScope.plugin.js';

const { Schema } = mongoose;

// MenuProduct = what the customer buys. Deliberately holds NO stock
// fields — that lives in InventoryItem/StockBalance and is linked only
// through Recipe. See §10 of the design doc.
const menuProductSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, trim: true, default: null },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },

    price: { type: Number, required: true, min: 0 }, // minor units
    tax: { type: Number, default: 0 }, // percentage, e.g. 15 = 15%

    imageKey: { type: String, default: null }, // R2 object key
    imageUrl: { type: String, default: null },

    modifierGroupIds: [{ type: Schema.Types.ObjectId, ref: 'ModifierGroup' }],
    recipeId: { type: Schema.Types.ObjectId, ref: 'Recipe', default: null },

    availableBranches: [{ type: Schema.Types.ObjectId, ref: 'Branch' }], // empty = all branches
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Organization-wide master data with branch-level availability override,
// per §7 of the design doc — not one product doc per branch.
applyBaseFields(menuProductSchema, { branchScoped: false });
menuProductSchema.plugin(tenantScopePlugin);

menuProductSchema.index({ organizationId: 1, categoryId: 1 });
menuProductSchema.index({ organizationId: 1, sku: 1 }, { sparse: true });

export const MenuProduct = mongoose.model('MenuProduct', menuProductSchema);

