import mongoose from 'mongoose';
import { applyBaseFields } from '../../common/models/baseSchema.js';
import { tenantScopePlugin } from '../../common/plugins/tenantScope.plugin.js';
import { POS_SHIFT_STATUS } from '../../config/constants.js';

const { Schema } = mongoose;

const posShiftSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    openedAt: { type: Date, default: Date.now },
    closedAt: { type: Date, default: null },
    openingCash: { type: Number, required: true, min: 0 },
    closingCash: { type: Number, default: null }, // actual counted cash at close
    expectedCash: { type: Number, default: null }, // computed at close time
    variance: { type: Number, default: null },
    status: { type: String, enum: Object.values(POS_SHIFT_STATUS), default: POS_SHIFT_STATUS.OPEN, index: true },
    notes: { type: String, default: null },
  },
  { timestamps: true }
);

applyBaseFields(posShiftSchema, { branchScoped: true });
posShiftSchema.plugin(tenantScopePlugin);

export const POSShift = mongoose.model('POSShift', posShiftSchema);


