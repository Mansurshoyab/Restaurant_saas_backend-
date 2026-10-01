import { Role } from './role.model.js';
import { Permission } from './permission.model.js';
import { User } from '../users/user.model.js';
import { ApiError } from '../../common/utils/apiError.js';

/**
 * Returns system roles (organizationId: null, seeded defaults like
 * CASHIER, WAITER) plus this org's own custom roles, so the create-staff
 * dropdown in the admin UI has one combined list.
 */
export async function listRolesForOrg(organizationId) {
  return Role.find({
    $or: [{ organizationId: null }, { organizationId }],
  }).sort({ isSystem: -1, name: 1 });
}

export async function getRoleById(organizationId, roleId) {
  const role = await Role.findOne({
    _id: roleId,
    $or: [{ organizationId: null }, { organizationId }],
  });
  if (!role) throw ApiError.notFound('Role not found');
  return role;
}

async function assertPermissionsExist(permissionKeys) {
  if (!permissionKeys.length) return;

  const found = await Permission.find({ key: { $in: permissionKeys } }).select('key');
  const foundKeys = new Set(found.map((p) => p.key));
  const invalid = permissionKeys.filter((k) => !foundKeys.has(k));

  if (invalid.length) {
    throw ApiError.badRequest(`Unknown permission key(s): ${invalid.join(', ')}`);
  }
}

/**
 * OrgAdmin creates a custom role scoped to their own organization only.
 * System roles (organizationId: null) are never created/edited through
 * this path — those come from the seed script exclusively.
 */
export async function createOrgRole(organizationId, input) {
  const { key, name, permissions } = input;

  await assertPermissionsExist(permissions);

  const existing = await Role.findOne({ organizationId, key });
  if (existing) throw ApiError.conflict('A role with this key already exists in your organization');

  return Role.create({
    organizationId,
    key,
    name,
    permissions,
    isSystem: false,
  });
}

export async function updateOrgRole(organizationId, roleId, updates) {
  const role = await Role.findOne({ _id: roleId, organizationId });
  if (!role) {
    throw ApiError.notFound('Custom role not found (system roles cannot be edited)');
  }

  if (updates.permissions) {
    await assertPermissionsExist(updates.permissions);
  }

  Object.assign(role, updates);
  await role.save();
  return role;
}

export async function deleteOrgRole(organizationId, roleId) {
  const role = await Role.findOne({ _id: roleId, organizationId });
  if (!role) {
    throw ApiError.notFound('Custom role not found (system roles cannot be deleted)');
  }

  const assignedCount = await User.countDocuments({ organizationId, roleId });
  if (assignedCount > 0) {
    throw ApiError.conflict(
      `Cannot delete role: ${assignedCount} staff member(s) are currently assigned to it`
    );
  }

  await role.deleteOne();
  return true;
}

export async function listPermissionCatalog() {
  return Permission.find().sort({ module: 1, key: 1 });
}


