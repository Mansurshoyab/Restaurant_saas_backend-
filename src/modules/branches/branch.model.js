import mongoose from 'mongoose';
import { applyBaseFields } from '../../common/models/baseSchema.js';
import { tenantScopePlugin } from '../../common/plugins/tenantScope.plugin.js';

const { Schema } = mongoose;

const branchSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, trim: true, default: null },
    phone: { type: String, trim: true, default: null },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
    },
  },
  { timestamps: true }
);

// branchScoped: false — a Branch document IS the branch; it doesn't
// belong to a branch. Only organizationId applies here.
applyBaseFields(branchSchema, { branchScoped: false });

// NOTE: not applying tenantScopePlugin here — the very first Branch is
// created inside auth.service.js's registration transaction, before any
// req.tenant context exists. Branch reads/writes from authenticated
// routes go through branch.service.js, which filters on organizationId
// explicitly. Revisit once the plugin supports a "creation" bypass mode
// cleaner than scattering skipTenantScope everywhere.

export const Branch = mongoose.model('Branch', branchSchema);

