import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { success, created } from '../../common/utils/apiResponse.js';
import * as shiftService from './shift.service.js';

export const openShift = asyncHandler(async (req, res) => {
  const shift = await shiftService.openShift(req.tenant, req.user.userId, req.body.openingCash);
  return created(res, shift, 'Shift opened');
});

export const closeShift = asyncHandler(async (req, res) => {
  const shift = await shiftService.closeShift(req.tenant, req.user.userId, req.body);
  return success(res, { message: 'Shift closed', data: shift });
});

export const getMyOpenShift = asyncHandler(async (req, res) => {
  const shift = await shiftService.getOpenShiftForUser(req.tenant, req.user.userId);
  return success(res, { message: 'Open shift', data: shift });
});

export const listShifts = asyncHandler(async (req, res) => {
  const shifts = await shiftService.listShifts(req.tenant, req.query);
  return success(res, { message: 'Shifts', data: shifts });
});

export const getShift = asyncHandler(async (req, res) => {
  const shift = await shiftService.getShiftById(req.tenant, req.params.id);
  return success(res, { message: 'Shift', data: shift });
});

export const getShiftSummary = asyncHandler(async (req, res) => {
  const summary = await shiftService.getShiftSummary(req.tenant, req.user.userId);
  return success(res, { message: 'Current shift summary', data: summary });
});
