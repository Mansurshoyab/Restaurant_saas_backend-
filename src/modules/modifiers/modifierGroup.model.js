import mongoose from 'mongoose';
import { applyBaseFields } from '../../common/models/baseSchema.js';
import { tenantScopePlugin } from '../../common/plugins/tenantScope.plugin.js';

const { Schema } = mongoose;

// e.g. "Pizza Size" (selectionType: SINGLE, required: true)
//      "Add-ons"    (selectionType: MULTIPLE, required: false)
const modifierGroupSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    selectionType: { type: String, enum: ['SINGLE', 'MULTIPLE'], default: 'MULTIPLE' },
    required: { type: Boolean, default: false },
    minSelect: { type: Number, default: 0 },
    maxSelect: { type: Number, default: null }, // null = unlimited
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

applyBaseFields(modifierGroupSchema, { branchScoped: false });
modifierGroupSchema.plugin(tenantScopePlugin);

export const ModifierGroup = mongoose.model('ModifierGroup', modifierGroupSchema);

