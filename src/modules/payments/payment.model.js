import mongoose from 'mongoose';
import { applyBaseFields } from '../../common/models/baseSchema.js';
import { tenantScopePlugin } from '../../common/plugins/tenantScope.plugin.js';
import { PAYMENT_METHOD } from '../../config/constants.js';

const { Schema } = mongoose;

const paymentSchema = new Schema(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    method: { type: String, enum: Object.values(PAYMENT_METHOD), required: true },
    amount: { type: Number, required: true, min: 0 },
    changeGiven: { type: Number, default: 0 }, // CASH only
    transactionId: { type: String, default: null }, // BKASH/NAGAD reference
    reference: { type: String, default: null },
    status: { type: String, enum: ['RECORDED', 'VOIDED'], default: 'RECORDED' },
    receivedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

applyBaseFields(paymentSchema, { branchScoped: true });
paymentSchema.plugin(tenantScopePlugin);

paymentSchema.index({ organizationId: 1, branchId: 1, orderId: 1 });

export const Payment = mongoose.model('Payment', paymentSchema);


