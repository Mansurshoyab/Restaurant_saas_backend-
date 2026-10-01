import mongoose from 'mongoose';

const { Schema } = mongoose;

// Organization-wide, one document per org — not branch-scoped, not
// tenantScope.plugin'd (single doc looked up by organizationId directly,
// same pattern as Organization itself).
const restaurantSettingsSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, unique: true, index: true },

    name: { type: String, default: null },
    logo: { type: String, default: null },
    phoneNumber: { type: String, default: null },

    currency: { type: String, default: 'BDT' },
    taxRatePercent: { type: Number, default: 0, min: 0, max: 100 },
    taxInclusive: { type: Boolean, default: false }, // whether product prices already include tax

    receiptHeader: { type: String, default: null },
    receiptFooter: { type: String, default: null },

    paymentMethodsEnabled: {
      type: [String],
      default: ['CASH', 'CARD', 'BKASH', 'NAGAD', 'OTHER'],
    },

    businessHours: {
      open: { type: String, default: '10:00' }, // "HH:mm"
      close: { type: String, default: '23:00' },
    },

    timezone: { type: String, default: 'Asia/Dhaka' },
  },
  { timestamps: true }
);

export const RestaurantSettings = mongoose.model('RestaurantSettings', restaurantSettingsSchema);


