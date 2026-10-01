import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { success } from '../../common/utils/apiResponse.js';
import { ApiError } from '../../common/utils/apiError.js';
import { uploadToR2 } from '../../common/utils/storage.util.js';
import * as settingsService from './settings.service.js';

export const getSettings = asyncHandler(async (req, res) => {
  const settings = await settingsService.getSettings(req.tenant.organizationId);
  return success(res, { message: 'Restaurant settings', data: settings });
});

export const updateSettings = asyncHandler(async (req, res) => {
  const settings = await settingsService.updateSettings(req.tenant.organizationId, req.body);
  return success(res, { message: 'Settings updated', data: settings });
});

export const uploadLogo = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw ApiError.badRequest('Image file is required');
  }

  const { url } = await uploadToR2({
    organizationId: req.tenant.organizationId,
    folder: 'logos',
    file: req.file,
  });

  const settings = await settingsService.updateSettings(req.tenant.organizationId, { logo: url });
  return success(res, { message: 'Logo uploaded successfully', data: settings });
});
