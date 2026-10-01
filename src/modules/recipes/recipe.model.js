import mongoose from 'mongoose';
import { applyBaseFields } from '../../common/models/baseSchema.js';
import { tenantScopePlugin } from '../../common/plugins/tenantScope.plugin.js';

const { Schema } = mongoose;

const recipeItemSchema = new Schema(
  {
    inventoryItemId: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true },
  },
  { _id: false }
);

/**
 * Versioned by design (§13): editing a recipe never mutates the old
 * document — it deactivates the current version and creates a new one.
 * OrderItem snapshots pin `recipeVersion` at sale time so historical
 * food-cost reports stay accurate even after the recipe changes later.
 */
const recipeSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'MenuProduct', required: true, index: true },
    items: { type: [recipeItemSchema], default: [] },
    version: { type: Number, required: true, default: 1 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

applyBaseFields(recipeSchema, { branchScoped: false });
recipeSchema.plugin(tenantScopePlugin);

// Only one active version per product at a time.
recipeSchema.index(
  { organizationId: 1, productId: 1, active: 1 },
  { unique: true, partialFilterExpression: { active: true } }
);

export const Recipe = mongoose.model('Recipe', recipeSchema);


