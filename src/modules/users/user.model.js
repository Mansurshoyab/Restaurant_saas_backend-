import mongoose from 'mongoose';

const { Schema } = mongoose;

// Deliberately NOT using tenantScope.plugin.js here: auth flows (login,
// OTP verify) must look up a user by email/phone BEFORE any tenant
// context exists. Tenant safety for user management (list/update staff)
// is enforced in user.service.js by explicitly filtering on organizationId.
const userSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', default: null, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },
    roleId: { type: Schema.Types.ObjectId, ref: 'Role', default: null },

    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, sparse: true, unique: true },
    phone: { type: String, trim: true, sparse: true, unique: true },
    passwordHash: { type: String, select: false },

    isSuperAdmin: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.index({ organizationId: 1, branchId: 1 });

export const User = mongoose.model('User', userSchema);

