import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * The restaurant-submitted half of §5's manual bKash flow. The owner
 * pays to the SaaS's bKash number outside the system, then submits the
 * TrxID here. SuperAdmin reviews and approves/rejects — approval is
 * what actually creates/extends the Subscription (see subscription.service.js).
 *
 * Not the same as Subscription itself: this is the request/review queue,
 * Subscription is the resulting entitlement record.
 */
const subscriptionRequestSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    planId: { type: Schema.Types.ObjectId, ref: 'Plan', required: true },

    amount: { type: Number, required: true },
    paymentMethod: { type: String, enum: ['BKASH', 'NAGAD'], default: 'BKASH' },
    senderBkashNumber: { type: String, required: true }, // number the owner paid FROM
    transactionId: { type: String, required: true }, // bKash TrxID they received
    screenshotUrl: { type: String, default: null }, // optional proof, via R2
    screenshotKey: { type: String, default: null },

    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },

    submittedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: null },

    resultingSubscriptionId: { type: Schema.Types.ObjectId, ref: 'Subscription', default: null },
  },
  { timestamps: true }
);

// Same TrxID can't be submitted twice — catches accidental double-submits
// and, more importantly, catches someone trying to reuse another
// restaurant's transaction ID.
subscriptionRequestSchema.index({ transactionId: 1 }, { unique: true });
subscriptionRequestSchema.index({ organizationId: 1, status: 1, createdAt: -1 });

export const SubscriptionRequest = mongoose.model('SubscriptionRequest', subscriptionRequestSchema);

