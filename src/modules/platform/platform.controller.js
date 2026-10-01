import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { success, created } from '../../common/utils/apiResponse.js';
import * as platformService from './platform.service.js';
import * as subscriptionService from '../subscriptions/subscription.service.js';



// --- Plans ---
export const listPlans = asyncHandler(async (req, res) => {
  const plans = await platformService.listPlans({
    includeInactive: req.query.includeInactive === 'true',
  });
  return success(res, { message: 'Plans', data: plans });
});

export const createPlan = asyncHandler(async (req, res) => {
  const plan = await platformService.createPlan(req.body);
  return created(res, plan, 'Plan created');
});

export const updatePlan = asyncHandler(async (req, res) => {
  const plan = await platformService.updatePlan(req.params.id, req.body);
  return success(res, { message: 'Plan updated', data: plan });
});

export const deactivatePlan = asyncHandler(async (req, res) => {
  await platformService.deactivatePlan(req.params.id);
  return success(res, { message: 'Plan deactivated' });
});

// --- Organizations ---
export const listOrganizations = asyncHandler(async (req, res) => {
  const { organizations, meta } = await platformService.listOrganizations(req.query);
  return success(res, { message: 'Organizations', data: organizations, meta });
});

export const getOrganizationDetail = asyncHandler(async (req, res) => {
  const detail = await platformService.getOrganizationDetail(req.params.id);
  return success(res, { message: 'Organization detail', data: detail });
});

export const updateOrganizationStatus = asyncHandler(async (req, res) => {
  const organization = await platformService.updateOrganizationStatus(
    req.params.id,
    req.body,
    req.user.userId
  );
  return success(res, { message: 'Organization status updated', data: organization });
});

// --- Subscriptions ---
export const listPendingVerifications = asyncHandler(async (req, res) => {
  const pending = await platformService.listPendingVerifications();
  return success(res, { message: 'Subscriptions needing attention', data: pending });
});

export const verifyPayment = asyncHandler(async (req, res) => {
  const subscription = await platformService.verifySubscriptionPayment(req.body, req.user.userId);
  return created(res, subscription, 'Payment verified, subscription activated');
});

export const updateSubscriptionStatus = asyncHandler(async (req, res) => {
  const subscription = await platformService.updateSubscriptionStatus(
    req.params.id,
    req.body,
    req.user.userId
  );
  return success(res, { message: 'Subscription status updated', data: subscription });
});

// --- Dashboard ---
export const getStats = asyncHandler(async (req, res) => {
  const stats = await platformService.getPlatformStats();
  return success(res, { message: 'Platform stats', data: stats });
});

export const getUsageStats = asyncHandler(async (req, res) => {
  const usage = await platformService.getPlatformUsageStats(req.query);
  return success(res, { message: 'Platform usage', data: usage });
});






export const listPendingRequests = asyncHandler(async (req, res) => {
  const requests = await subscriptionService.listPendingRequests();
  return success(res, { message: 'Pending subscription requests', data: requests });
});

export const getRequestDetail = asyncHandler(async (req, res) => {
  const request = await subscriptionService.getRequestById(req.params.id);
  return success(res, { message: 'Subscription request', data: request });
});

export const reviewRequest = asyncHandler(async (req, res) => {
  const request = await subscriptionService.reviewPaymentRequest(
    req.params.id,
    req.body,
    req.user.userId
  );
  return success(res, { message: `Request ${request.status.toLowerCase()}`, data: request });
});

