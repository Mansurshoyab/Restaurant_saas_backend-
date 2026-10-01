import mongoose from 'mongoose';
import { Subscription } from './subscription.model.js';
import { SubscriptionRequest } from './subscriptionRequest.model.js';
import { Plan } from '../platform/plan.model.js';
import { Organization } from '../organizations/organization.model.js';
import { ApiError } from '../../common/utils/apiError.js';
import { SUBSCRIPTION_STATUS } from '../../config/constants.js';
import { logAudit } from '../audit/auditLog.service.js';
import { publish } from '../../common/events/eventBus.js';
import { EVENTS } from '../../common/events/eventTypes.js';
import { uploadToR2 } from '../../common/utils/storage.util.js';

export async function getActiveSubscription(organizationId) {
  return Subscription.findOne({ organizationId })
    .sort({ createdAt: -1 })
    .populate('planId', 'name key price billingCycle features limits');
}

export async function isSubscriptionUsable(organizationId) {
  const sub = await getActiveSubscription(organizationId);
  if (!sub) return false;
  return (
    [SUBSCRIPTION_STATUS.TRIAL, SUBSCRIPTION_STATUS.ACTIVE].includes(sub.status) &&
    sub.endDate > new Date()
  );
}

export async function expireOverdueSubscriptions() {
  const result = await Subscription.updateMany(
    { status: { $in: [SUBSCRIPTION_STATUS.TRIAL, SUBSCRIPTION_STATUS.ACTIVE] }, endDate: { $lt: new Date() } },
    { $set: { status: SUBSCRIPTION_STATUS.EXPIRED } }
  );
  return result.modifiedCount;
}

export async function notifyExpiringSubscriptions() {
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const expiring = await Subscription.find({
    status: { $in: [SUBSCRIPTION_STATUS.TRIAL, SUBSCRIPTION_STATUS.ACTIVE] },
    endDate: { $gte: now, $lte: in7Days },
  }).lean();

  for (const sub of expiring) {
    await publish(EVENTS.SUBSCRIPTION_EXPIRING, {
      organizationId: sub.organizationId.toString(),
      endDate: sub.endDate,
      daysRemaining: Math.ceil((sub.endDate - now) / (24 * 60 * 60 * 1000)),
    });
  }
  return expiring.length;
}

// ---------- Restaurant side: list plans, submit payment proof ----------

export async function listAvailablePlans() {
  return Plan.find({ isActive: true }).sort({ sortOrder: 1, price: 1 });
}

/**
 * Restaurant owner submits their bKash TrxID after paying manually.
 * Creates a PENDING request — does NOT touch the Subscription itself.
 * SuperAdmin review (below) is what actually activates anything.
 */
export async function submitPaymentRequest(tenant, userId, input, screenshotFile) {
  const { planId, senderBkashNumber, transactionId } = input;

  const plan = await Plan.findOne({ _id: planId, isActive: true });
  if (!plan) throw ApiError.badRequest('Plan not found or no longer available');

  const duplicate = await SubscriptionRequest.findOne({ transactionId });
  if (duplicate) {
    throw ApiError.conflict(
      'This transaction ID has already been submitted. Contact support if this is a mistake.'
    );
  }

  const existingPending = await SubscriptionRequest.findOne({
    organizationId: tenant.organizationId,
    status: 'PENDING',
  });
  if (existingPending) {
    throw ApiError.conflict(
      'You already have a pending payment request awaiting review. Please wait for it to be processed.'
    );
  }

  let screenshotUrl = null;
  let screenshotKey = null;
  if (screenshotFile) {
    const uploaded = await uploadToR2({
      organizationId: tenant.organizationId,
      folder: 'subscription-proofs',
      file: screenshotFile,
    });
    screenshotUrl = uploaded.url;
    screenshotKey = uploaded.key;
  }

  const request = await SubscriptionRequest.create({
    organizationId: tenant.organizationId,
    planId,
    amount: plan.price,
    paymentMethod: 'BKASH',
    senderBkashNumber,
    transactionId,
    screenshotUrl,
    screenshotKey,
    status: 'PENDING',
    submittedBy: userId,
  });

  return request;
}

export async function listMyPaymentRequests(organizationId) {
  return SubscriptionRequest.find({ organizationId })
    .populate('planId', 'name price')
    .sort({ createdAt: -1 });
}

// ---------- Platform side: review queue ----------

export async function listPendingRequests() {
  return SubscriptionRequest.find({ status: 'PENDING' })
    .populate('organizationId', 'name status')
    .populate('planId', 'name price billingCycle')
    .sort({ createdAt: 1 }); // oldest first — FIFO review queue
}

export async function getRequestById(requestId) {
  const request = await SubscriptionRequest.findById(requestId)
    .populate('organizationId', 'name status')
    .populate('planId', 'name price billingCycle');
  if (!request) throw ApiError.notFound('Subscription request not found');
  return request;
}

/**
 * The actual approve/reject action. On APPROVE, this is the single
 * place a real Subscription gets created from a manual payment —
 * mirrors what platform.service.js's verifySubscriptionPayment does,
 * but starting from a restaurant-submitted request instead of the
 * SuperAdmin typing details in blind.
 */
export async function reviewPaymentRequest(requestId, { action, rejectionReason }, superAdminId) {
  const request = await SubscriptionRequest.findById(requestId);
  if (!request) throw ApiError.notFound('Subscription request not found');
  if (request.status !== 'PENDING') {
    throw ApiError.badRequest(`This request has already been ${request.status.toLowerCase()}`);
  }

  if (action === 'REJECT') {
    request.status = 'REJECTED';
    request.reviewedBy = superAdminId;
    request.reviewedAt = new Date();
    request.rejectionReason = rejectionReason;
    await request.save();

    await logAudit({
      organizationId: request.organizationId,
      userId: superAdminId,
      action: 'subscription.request_rejected',
      entityType: 'SubscriptionRequest',
      entityId: request._id,
      reason: rejectionReason,
    });

    return request;
  }

  // APPROVE
  const plan = await Plan.findById(request.planId);
  if (!plan) throw ApiError.badRequest('Plan no longer exists');

  const periodDays = plan.billingCycle === 'YEARLY' ? 365 : 30;
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + periodDays * 24 * 60 * 60 * 1000);

  const session = await mongoose.startSession();
  try {
    let subscription;

    await session.withTransaction(async () => {
      await Subscription.updateMany(
        {
          organizationId: request.organizationId,
          status: { $in: [SUBSCRIPTION_STATUS.TRIAL, SUBSCRIPTION_STATUS.ACTIVE] },
        },
        { $set: { status: SUBSCRIPTION_STATUS.EXPIRED } },
        { session }
      );

      [subscription] = await Subscription.create(
        [
          {
            organizationId: request.organizationId,
            planId: plan._id,
            plan: plan.billingCycle,
            status: SUBSCRIPTION_STATUS.ACTIVE,
            startDate,
            endDate,
            amount: request.amount,
            paymentReference: request.transactionId,
            verifiedBy: superAdminId,
            verifiedAt: new Date(),
            notes: `Approved from request ${request._id}`,
          },
        ],
        { session }
      );

      request.status = 'APPROVED';
      request.reviewedBy = superAdminId;
      request.reviewedAt = new Date();
      request.resultingSubscriptionId = subscription._id;
      await request.save({ session });

      // Reactivate the org if it had been suspended for non-payment
      const organization = await Organization.findById(request.organizationId).session(session);
      if (organization && organization.status === 'SUSPENDED') {
        organization.status = 'ACTIVE';
        await organization.save({ session });
      }
    });

    await logAudit({
      organizationId: request.organizationId,
      userId: superAdminId,
      action: 'subscription.request_approved',
      entityType: 'Subscription',
      entityId: subscription._id,
      newValue: { plan: plan.key, amount: request.amount, endDate },
    });

    return request;
  } finally {
    await session.endSession();
  }
}


