import mongoose from 'mongoose';

export function resolveTenant(req, res, next) {
  if (!req.user) {
    return next(ApiError.unauthorized('Authentication required before tenant resolution'));
  }

  const { organizationId, branchId } = req.user;

  if (!organizationId && !req.user.isSuperAdmin) {
    return next(ApiError.forbidden('User is not associated with an organization'));
  }

  const requestedBranchId = req.headers['x-branch-id'] || req.query.branchId;
  const resolvedBranchId = requestedBranchId || branchId || null;

  // Cast to ObjectId here so aggregation pipelines downstream work —
  // $match does not auto-cast strings the way find() does.
  req.tenant = {
    organizationId: organizationId ? new mongoose.Types.ObjectId(organizationId) : null,
    branchId: resolvedBranchId ? new mongoose.Types.ObjectId(resolvedBranchId) : null,
  };

  next();
}


