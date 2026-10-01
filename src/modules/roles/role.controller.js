import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { success, created } from '../../common/utils/apiResponse.js';
import * as roleService from './role.service.js';

export const listRoles = asyncHandler(async (req, res) => {
  const roles = await roleService.listRolesForOrg(req.tenant.organizationId);
  return success(res, { message: 'Roles', data: roles });
});

export const getRole = asyncHandler(async (req, res) => {
  const role = await roleService.getRoleById(req.tenant.organizationId, req.params.id);
  return success(res, { message: 'Role', data: role });
});

export const createRole = asyncHandler(async (req, res) => {
  const role = await roleService.createOrgRole(req.tenant.organizationId, req.body);
  return created(res, role, 'Role created');
});

export const updateRole = asyncHandler(async (req, res) => {
  const role = await roleService.updateOrgRole(
    req.tenant.organizationId,
    req.params.id,
    req.body
  );
  return success(res, { message: 'Role updated', data: role });
});

export const deleteRole = asyncHandler(async (req, res) => {
  await roleService.deleteOrgRole(req.tenant.organizationId, req.params.id);
  return success(res, { message: 'Role deleted' });
});

export const listPermissions = asyncHandler(async (req, res) => {
  const permissions = await roleService.listPermissionCatalog();
  return success(res, { message: 'Permission catalog', data: permissions });
});


