import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { success, created } from '../../common/utils/apiResponse.js';
import * as userService from './user.service.js';

export const createStaff = asyncHandler(async (req, res) => {
  const user = await userService.createStaffMember(req.tenant.organizationId, req.body);
  return created(res, user, 'Staff account created');
});

export const listStaff = asyncHandler(async (req, res) => {
  const users = await userService.listStaff(req.tenant.organizationId, {
    branchId: req.query.branchId,
  });
  return success(res, { message: 'Staff list', data: users });
});

export const getStaff = asyncHandler(async (req, res) => {
  const user = await userService.getStaffById(req.tenant.organizationId, req.params.id);
  return success(res, { message: 'Staff member', data: user });
});

export const updateStaff = asyncHandler(async (req, res) => {
  const user = await userService.updateStaffMember(
    req.tenant.organizationId,
    req.params.id,
    req.body
  );
  return success(res, { message: 'Staff member updated', data: user });
});

export const resetPassword = asyncHandler(async (req, res) => {
  await userService.resetStaffPassword(
    req.tenant.organizationId,
    req.params.id,
    req.body.password
  );
  return success(res, { message: 'Password reset successfully' });
});

export const deactivateStaff = asyncHandler(async (req, res) => {
  const user = await userService.deactivateStaffMember(req.tenant.organizationId, req.params.id);
  return success(res, { message: 'Staff member deactivated', data: user });
});


