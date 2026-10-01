import mongoose from 'mongoose';

const { Schema } = mongoose;

// Root tenant document. Deliberately minimal — RestaurantSettings.model.js
// (tax/currency/receipt config) is a separate document created during
// onboarding (§6), not embedded here, so it can be edited independently
// without touching the tenant root record.
const organizationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    status: {
      type: String,
      enum: ['ACTIVE', 'SUSPENDED', 'CLOSED'],
      default: 'ACTIVE',
    },
    logoUrl: { type: String, default: null },
    logoKey: { type: String, default: null }, // R2 object key, for delete/replace
  },
  { timestamps: true }
);

export const Organization = mongoose.model('Organization', organizationSchema);

