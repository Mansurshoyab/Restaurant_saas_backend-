import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { success, created } from '../../common/utils/apiResponse.js';
import * as branchService from './branch.service.js';

export const listBranches = asyncHandler(async (req, res) => {
  const branches = await branchService.listBranches(req.tenant.organizationId);
  return success(res, { message: 'Branches', data: branches });
});

export const getBranch = asyncHandler(async (req, res) => {
  const branch = await branchService.getBranchById(req.tenant.organizationId, req.params.id);
  return success(res, { message: 'Branch', data: branch });
});

export const createBranch = asyncHandler(async (req, res) => {
  const branch = await branchService.createBranch(req.tenant.organizationId, req.body);
  return created(res, branch, 'Branch created');
});

export const updateBranch = asyncHandler(async (req, res) => {
  const branch = await branchService.updateBranch(
    req.tenant.organizationId,
    req.params.id,
    req.body
  );
  return success(res, { message: 'Branch updated', data: branch });
});

export const deactivateBranch = asyncHandler(async (req, res) => {
  const branch = await branchService.deactivateBranch(req.tenant.organizationId, req.params.id);
  return success(res, { message: 'Branch deactivated', data: branch });
});

