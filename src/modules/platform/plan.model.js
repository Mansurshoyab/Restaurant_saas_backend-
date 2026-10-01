import mongoose from 'mongoose';

const { Schema } = mongoose;

// Platform-level master data — no organizationId, owned by the SaaS
// operator, not by any tenant. This is what restaurants subscribe TO.
const planSchema = new Schema(
  {
    name: { type: String, required: true, trim: true }, // "Starter", "Professional"
    key: { type: String, required: true, unique: true, uppercase: true },
    billingCycle: { type: String, enum: ['MONTHLY', 'YEARLY'], required: true },
    price: { type: Number, required: true, min: 0 },

    // Soft limits enforced at the platform level — null means unlimited
    limits: {
      maxBranches: { type: Number, default: null },
      maxUsers: { type: Number, default: null },
      maxProducts: { type: Number, default: null },
    },

    features: [{ type: String }], // e.g. ['multi_branch', 'kds', 'advanced_reports']
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Plan = mongoose.model('Plan', planSchema);


