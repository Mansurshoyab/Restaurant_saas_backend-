import mongoose from 'mongoose';

const { Schema } = mongoose;

const subscriptionSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },

    planId: { type: Schema.Types.ObjectId, ref: 'Plan', default: null }, // NEW — links to platform Plan
    plan: { type: String, enum: ['MONTHLY', 'YEARLY'], required: true },
    status: {
      type: String,
      enum: ['TRIAL', 'ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED'],
      default: 'TRIAL',
      index: true,
    },

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    amount: { type: Number, default: 0 },
    // Unique so the same bKash TrxID can't be entered twice by mistake —
    // the most likely manual-verification error (§5).
    paymentReference: { type: String, default: null, unique: true, sparse: true },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    verifiedAt: { type: Date, default: null },
    notes: { type: String, default: null }, // NEW
  },
  { timestamps: true }
);

subscriptionSchema.index({ organizationId: 1, createdAt: -1 });

export const Subscription = mongoose.model('Subscription', subscriptionSchema);


