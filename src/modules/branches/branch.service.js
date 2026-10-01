import { Branch } from './branch.model.js';
import { ApiError } from '../../common/utils/apiError.js';

// All queries here filter on organizationId explicitly — see note in
// branch.model.js on why tenantScopePlugin isn't applied to this model.

export async function listBranches(organizationId) {
  return Branch.find({ organizationId }).sort({ createdAt: 1 });
}

export async function getBranchById(organizationId, branchId) {
  const branch = await Branch.findOne({ _id: branchId, organizationId });
  if (!branch) throw ApiError.notFound('Branch not found');
  return branch;
}

export async function createBranch(organizationId, input) {
  return Branch.create({ ...input, organizationId });
}

export async function updateBranch(organizationId, branchId, updates) {
  const branch = await Branch.findOneAndUpdate(
    { _id: branchId, organizationId },
    updates,
    { new: true, runValidators: true }
  );
  if (!branch) throw ApiError.notFound('Branch not found');
  return branch;
}

export async function deactivateBranch(organizationId, branchId) {
  return updateBranch(organizationId, branchId, { status: 'INACTIVE' });
}

