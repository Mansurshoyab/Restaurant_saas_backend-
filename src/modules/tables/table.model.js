import mongoose from 'mongoose';
import { applyBaseFields } from '../../common/models/baseSchema.js';
import { tenantScopePlugin } from '../../common/plugins/tenantScope.plugin.js';

const { Schema } = mongoose;

const tableSchema = new Schema(
  {
    diningAreaId: { type: Schema.Types.ObjectId, ref: 'DiningArea', default: null },
    label: { type: String, required: true, trim: true }, // "A1", "B3"
    seats: { type: Number, default: 4 },
    status: { type: String, enum: ['AVAILABLE', 'OCCUPIED', 'RESERVED'], default: 'AVAILABLE' },
    currentOrderId: { type: Schema.Types.ObjectId, ref: 'Order', default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

applyBaseFields(tableSchema, { branchScoped: true });
tableSchema.plugin(tenantScopePlugin);

tableSchema.index({ organizationId: 1, branchId: 1, label: 1 }, { unique: true });

export const Table = mongoose.model('Table', tableSchema);


