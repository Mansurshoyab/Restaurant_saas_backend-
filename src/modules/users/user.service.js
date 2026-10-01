import bcrypt from 'bcryptjs';
import { User } from './user.model.js';
import { Role } from '../roles/role.model.js';
import { Branch } from '../branches/branch.model.js';
import { ApiError } from '../../common/utils/apiError.js';
import { revokeAllRefreshTokens } from '../auth/token.util.js';

const SALT_ROUNDS = 12;

// All queries explicitly filter on organizationId — User isn't behind
// tenantScope.plugin.js (see user.model.js note: auth needs to look
// users up by email/phone before any tenant context exists).

async function assertRoleAndBranchBelongToOrg(organizationId, roleId, branchId) {
  const [role, branch] = await Promise.all([
    Role.findOne({ _id: roleId, $or: [{ organizationId: null }, { organizationId }] }),
    Branch.findOne({ _id: branchId, organizationId }),
  ]);

  if (!role) throw ApiError.badRequest('Role not found for this organization');
  if (!branch) throw ApiError.badRequest('Branch not found for this organization');

  return { role, branch };
}

/**
 * OrgAdmin/BranchManager creates a staff account directly — sets the
 * password themselves and hands the credentials to the staff member
 * out of band (no self-signup, no invite-link flow for v1).
 */
export async function createStaffMember(organizationId, input) {
  const { name, email, phone, password, roleId, branchId } = input;

  await assertRoleAndBranchBelongToOrg(organizationId, roleId, branchId);

  if (email) {
    const existing = await User.findOne({ email });
    if (existing) throw ApiError.conflict('A user with this email already exists');
  }
  if (phone) {
    const existing = await User.findOne({ phone });
    if (existing) throw ApiError.conflict('A user with this phone number already exists');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await User.create({
    organizationId,
    branchId,
    roleId,
    name,
    email,
    phone,
    passwordHash,
    isSuperAdmin: false,
    isActive: true,
  });

  return sanitize(user);
}

export async function listStaff(organizationId, { branchId } = {}) {
  const filter = { organizationId };
  if (branchId) filter.branchId = branchId;

  const users = await User.find(filter)
    .populate('roleId', 'key name')
    .populate('branchId', 'name')
    .sort({ createdAt: -1 });

  return users.map(sanitize);
}

export async function getStaffById(organizationId, userId) {
  const user = await User.findOne({ _id: userId, organizationId })
    .populate('roleId', 'key name permissions')
    .populate('branchId', 'name');

  if (!user) throw ApiError.notFound('Staff member not found');
  return sanitize(user);
}

export async function updateStaffMember(organizationId, userId, updates) {
  const user = await User.findOne({ _id: userId, organizationId });
  if (!user) throw ApiError.notFound('Staff member not found');

  if (updates.roleId || updates.branchId) {
    await assertRoleAndBranchBelongToOrg(
      organizationId,
      updates.roleId || user.roleId,
      updates.branchId || user.branchId
    );
  }

  if (updates.email && updates.email !== user.email) {
    const existing = await User.findOne({ email: updates.email, _id: { $ne: userId } });
    if (existing) throw ApiError.conflict('A user with this email already exists');
  }
  if (updates.phone && updates.phone !== user.phone) {
    const existing = await User.findOne({ phone: updates.phone, _id: { $ne: userId } });
    if (existing) throw ApiError.conflict('A user with this phone number already exists');
  }

  Object.assign(user, updates);
  await user.save();

  // Role/branch/permission changes should force re-login so the JWT
  // (which embeds permissions — see token.util.js) can't outlive them.
  if (updates.roleId || updates.branchId || updates.isActive === false) {
    await revokeAllRefreshTokens(user._id.toString());
  }

  return sanitize(user);
}

export async function resetStaffPassword(organizationId, userId, newPassword) {
  const user = await User.findOne({ _id: userId, organizationId });
  if (!user) throw ApiError.notFound('Staff member not found');

  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await user.save();
  await revokeAllRefreshTokens(user._id.toString());

  return true;
}

export async function deactivateStaffMember(organizationId, userId) {
  return updateStaffMember(organizationId, userId, { isActive: false });
}

function sanitize(user) {
  const obj = user.toObject ? user.toObject() : user;
  delete obj.passwordHash;
  return obj;
}


