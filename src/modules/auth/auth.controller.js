import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { success, created } from '../../common/utils/apiResponse.js';
import * as authService from './auth.service.js';

export const register = asyncHandler(async (req, res) => {
  const result = await authService.registerOrganizationOwner(req.body);
  return created(res, result, 'Restaurant registered successfully');
});

export const login = asyncHandler(async (req, res) => {
  const result = await authService.loginWithPassword(req.body);
  return success(res, { message: 'Login successful', data: result });
});

export const changePassword = asyncHandler(async (req, res) => {
  await authService.changePassword(req.user.userId, req.body);
  return success(res, { message: 'Password changed. Please log in again.' });
});

export const requestOtp = asyncHandler(async (req, res) => {
  await authService.requestPhoneOtp(req.body.phone);
  return success(res, { message: 'OTP sent if the number is registered' });
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const result = await authService.verifyPhoneOtpAndLogin(req.body.phone, req.body.code);
  return success(res, { message: 'Login successful', data: result });
});

export const refresh = asyncHandler(async (req, res) => {
  const result = await authService.refreshTokens(req.body.refreshToken);
  return success(res, { message: 'Token refreshed', data: result });
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.user.userId, req.body.refreshToken);
  return success(res, { message: 'Logged out successfully' });
});

export const logoutAll = asyncHandler(async (req, res) => {
  await authService.logoutAllDevices(req.user.userId);
  return success(res, { message: 'Logged out from all devices' });
});

export const me = asyncHandler(async (req, res) => {
  const user = await authService.getCurrentUser(req.user.userId);
  return success(res, { message: 'Current user', data: user });
});

