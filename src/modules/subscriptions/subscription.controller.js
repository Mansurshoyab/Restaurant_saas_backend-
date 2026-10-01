import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { success, created } from '../../common/utils/apiResponse.js';
import { ApiError } from '../../common/utils/apiError.js';
import * as subscriptionService from './subscription.service.js';

export const getMySubscription = asyncHandler(async (req, res) => {
  const subscription = await subscriptionService.getActiveSubscription(req.tenant.organizationId);
  return success(res, { message: 'Subscription', data: subscription });
});

export const listPlans = asyncHandler(async (req, res) => {
  const plans = await subscriptionService.listAvailablePlans();
  return success(res, { message: 'Available plans', data: plans });
});

export const submitPaymentRequest = asyncHandler(async (req, res) => {
  const request = await subscriptionService.submitPaymentRequest(
    req.tenant,
    req.user.userId,
    req.body,
    req.file
  );
  return created(res, request, 'Payment submitted for review');
});

export const listMyRequests = asyncHandler(async (req, res) => {
  const requests = await subscriptionService.listMyPaymentRequests(req.tenant.organizationId);
  return success(res, { message: 'Your payment requests', data: requests });
});



