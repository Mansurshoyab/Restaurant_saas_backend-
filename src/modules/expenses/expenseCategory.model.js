import mongoose from 'mongoose';
import { applyBaseFields } from '../../common/models/baseSchema.js';
import { tenantScopePlugin } from '../../common/plugins/tenantScope.plugin.js';

const { Schema } = mongoose;

const expenseCategorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

applyBaseFields(expenseCategorySchema, { branchScoped: false });
expenseCategorySchema.plugin(tenantScopePlugin);

export const ExpenseCategory = mongoose.model('ExpenseCategory', expenseCategorySchema);
