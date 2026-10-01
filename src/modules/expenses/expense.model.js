import mongoose from 'mongoose';
import { applyBaseFields } from '../../common/models/baseSchema.js';
import { tenantScopePlugin } from '../../common/plugins/tenantScope.plugin.js';
import { PAYMENT_METHOD } from '../../config/constants.js';

const { Schema } = mongoose;

const expenseSchema = new Schema(
  {
    category: {
      type: String,
      required: true,
      trim: true,
    },
    description: { type: String, default: null },
    amount: { type: Number, required: true, min: 0 },
    method: { type: String, enum: Object.values(PAYMENT_METHOD), default: PAYMENT_METHOD.CASH },
    paidBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    expenseDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

applyBaseFields(expenseSchema, { branchScoped: true });
expenseSchema.plugin(tenantScopePlugin);

expenseSchema.index({ organizationId: 1, branchId: 1, expenseDate: -1 });

export const Expense = mongoose.model('Expense', expenseSchema);


