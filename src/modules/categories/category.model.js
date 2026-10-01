import mongoose from 'mongoose';
import { applyBaseFields } from '../../common/models/baseSchema.js';
import { tenantScopePlugin } from '../../common/plugins/tenantScope.plugin.js';

const { Schema } = mongoose;

const categorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Categories are organization-wide (shared across branches), not
// branch-scoped — a "Burgers" category exists once per restaurant,
// not once per branch. Individual products control branch availability.
applyBaseFields(categorySchema, { branchScoped: false });
categorySchema.plugin(tenantScopePlugin);

categorySchema.index({ organizationId: 1, name: 1 }, { unique: true });

export const Category = mongoose.model('Category', categorySchema);


