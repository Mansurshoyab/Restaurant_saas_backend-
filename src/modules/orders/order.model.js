import mongoose from 'mongoose';
import { applyBaseFields } from '../../common/models/baseSchema.js';
import { tenantScopePlugin } from '../../common/plugins/tenantScope.plugin.js';
import { orderItemSchema } from './orderItem.schema.js';
import { ORDER_TYPE, ORDER_STATUS, PAYMENT_STATUS } from '../../config/constants.js';

const { Schema } = mongoose;

const orderSchema = new Schema(
  {
    orderNumber: { type: String, required: true },
    orderType: { type: String, enum: Object.values(ORDER_TYPE), required: true },
    tableId: { type: Schema.Types.ObjectId, ref: 'Table', default: null },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', default: null },

    items: { type: [orderItemSchema], default: [] },

    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, default: 0 },

    status: { type: String, enum: Object.values(ORDER_STATUS), default: ORDER_STATUS.DRAFT, index: true },
    paymentStatus: { type: String, enum: Object.values(PAYMENT_STATUS), default: PAYMENT_STATUS.UNPAID },

    cancelReason: { type: String, default: null },
    cancelledBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

applyBaseFields(orderSchema, { branchScoped: true });
orderSchema.plugin(tenantScopePlugin);

orderSchema.index({ organizationId: 1, branchId: 1, orderNumber: 1 }, { unique: true });
orderSchema.index({ organizationId: 1, branchId: 1, status: 1, createdAt: -1 });

export const Order = mongoose.model('Order', orderSchema);


