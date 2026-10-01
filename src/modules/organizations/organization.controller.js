import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { success } from '../../common/utils/apiResponse.js';
import * as organizationService from './organization.service.js';

export const getMyOrganization = asyncHandler(async (req, res) => {
  const org = await organizationService.getOrganizationById(req.tenant.organizationId);
  return success(res, { message: 'Organization', data: org });
});

export const updateMyOrganization = asyncHandler(async (req, res) => {
  const org = await organizationService.updateOrganization(req.tenant.organizationId, req.body);
  return success(res, { message: 'Organization updated', data: org });
});

