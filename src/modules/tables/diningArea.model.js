import mongoose from 'mongoose';
import { applyBaseFields } from '../../common/models/baseSchema.js';
import { tenantScopePlugin } from '../../common/plugins/tenantScope.plugin.js';

const { Schema } = mongoose;

const diningAreaSchema = new Schema(
  {
    name: { type: String, required: true, trim: true }, // "Ground Floor", "Rooftop"
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

applyBaseFields(diningAreaSchema, { branchScoped: true });
diningAreaSchema.plugin(tenantScopePlugin);

export const DiningArea = mongoose.model('DiningArea', diningAreaSchema);


