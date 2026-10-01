import mongoose from 'mongoose';
import { applyBaseFields } from '../../common/models/baseSchema.js';
import { tenantScopePlugin } from '../../common/plugins/tenantScope.plugin.js';

const { Schema } = mongoose;

const supplierSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    contactPerson: { type: String, trim: true, default: null },
    phone: { type: String, trim: true, default: null },
    email: { type: String, trim: true, lowercase: true, default: null },
    address: { type: String, trim: true, default: null },
    paymentTerms: { type: String, default: null }, // e.g. "Net 30", "Cash on delivery"
    notes: { type: String, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Organization-wide — a supplier serves the whole restaurant, not one branch.
applyBaseFields(supplierSchema, { branchScoped: false });
supplierSchema.plugin(tenantScopePlugin);

supplierSchema.index({ organizationId: 1, name: 1 });

export const Supplier = mongoose.model('Supplier', supplierSchema);


