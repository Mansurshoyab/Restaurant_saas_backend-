import mongoose from 'mongoose';
import { applyBaseFields } from '../../common/models/baseSchema.js';
import { tenantScopePlugin } from '../../common/plugins/tenantScope.plugin.js';

const { Schema } = mongoose;

// A single addable/selectable option, e.g. "Cheese +৳30" or "Large ৳850".
// Embedded quantities from RecipeItem are NOT referenced here — a modifier
// that consumes extra inventory (e.g. "extra cheese") links to its own
// optional Recipe adjustment at the product level; keeping modifiers
// simple (name + price) for v1 per the design doc's MVP scope.
const modifierSchema = new Schema(
  {
    modifierGroupId: { type: Schema.Types.ObjectId, ref: 'ModifierGroup', required: true, index: true },
    name: { type: String, required: true, trim: true },
    price: { type: Number, default: 0 }, // minor units — see money.util.js
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

applyBaseFields(modifierSchema, { branchScoped: false });
modifierSchema.plugin(tenantScopePlugin);

export const Modifier = mongoose.model('Modifier', modifierSchema);


