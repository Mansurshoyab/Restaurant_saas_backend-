import mongoose from 'mongoose';
import { applyBaseFields } from '../../common/models/baseSchema.js';
import { tenantScopePlugin } from '../../common/plugins/tenantScope.plugin.js';

const { Schema } = mongoose;

// Deliberately minimal for v1 — full loyalty/CRM features are Phase 3.
// Exists now mainly so delivery/takeaway orders can attach a name+phone.
const customerSchema = new Schema(
  {
    name: { type: String, trim: true, default: null },
    phone: { type: String, trim: true, default: null, index: true },
    address: { type: String, trim: true, default: null },
    notes: { type: String, default: null },
  },
  { timestamps: true }
);

applyBaseFields(customerSchema, { branchScoped: false });
customerSchema.plugin(tenantScopePlugin);

customerSchema.index({ organizationId: 1, phone: 1 }, { sparse: true });

export const Customer = mongoose.model('Customer', customerSchema);


