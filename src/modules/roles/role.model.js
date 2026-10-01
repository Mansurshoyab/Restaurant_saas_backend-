import mongoose from 'mongoose';

const { Schema } = mongoose;

// organizationId = null → system/template role (e.g. seeded defaults).
// organizationId set → org-specific customized role (future: lets an
// OrgAdmin tweak permissions per restaurant without touching other tenants).
const roleSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', default: null, index: true },
    key: { type: String, required: true, trim: true }, // e.g. 'CASHIER'
    name: { type: String, required: true, trim: true }, // display name
    permissions: [{ type: String }], // e.g. ['order:create', 'order:cancel']
    isSystem: { type: Boolean, default: false },
  },
  { timestamps: true }
);

roleSchema.index({ organizationId: 1, key: 1 }, { unique: true });

export const Role = mongoose.model('Role', roleSchema);

