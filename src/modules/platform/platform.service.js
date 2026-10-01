import mongoose from 'mongoose';
import { Plan } from './plan.model.js';
import { Organization } from '../organizations/organization.model.js';
import { Branch } from '../branches/branch.model.js';
import { User } from '../users/user.model.js';
import { Subscription } from '../subscriptions/subscription.model.js';
import { Order } from '../orders/order.model.js';
import { ApiError } from '../../common/utils/apiError.js';
import { SUBSCRIPTION_STATUS, ORDER_STATUS } from '../../config/constants.js';
import { getPagination, buildPaginationMeta } from '../../common/utils/pagination.js';
import { logAudit } from '../audit/auditLog.service.js';
import { revokeAllRefreshTokens } from '../auth/token.util.js';
import { publish } from '../../common/events/eventBus.js';
import { EVENTS } from '../../common/events/eventTypes.js';

// ---------- Plans ----------

export async function listPlans({ includeInactive = false } = {}) {
  const query = includeInactive ? {} : { isActive: true };
  return Plan.find(query).sort({ sortOrder: 1, price: 1 });
}

export async function createPlan(input) {
  const existing = await Plan.findOne({ key: input.key });
  if (existing) throw ApiError.conflict('A plan with this key already exists');
  return Plan.create(input);
}

export async function updatePlan(planId, updates) {
  const plan = await Plan.findByIdAndUpdate(planId, updates, { new: true, runValidators: true });
  if (!plan) throw ApiError.notFound('Plan not found');
  return plan;
}

export async function deactivatePlan(planId) {
  const activeSubs = await Subscription.countDocuments({
    planId,
    status: { $in: [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.TRIAL] },
  });
  if (activeSubs > 0) {
    throw ApiError.conflict(
      `Cannot deactivate: ${activeSubs} organization(s) are currently on this plan`
    );
  }
  return Plan.findByIdAndUpdate(planId, { isActive: false }, { new: true });
}

// ---------- Organizations (tenant oversight) ----------

export async function listOrganizations(filters = {}) {
  const { page, limit, skip } = getPagination(filters);

  const query = {};
  if (filters.status) query.status = filters.status;
  if (filters.search) query.name = { $regex: filters.search, $options: 'i' };

  const [organizations, total] = await Promise.all([
    Organization.find(query)
      .populate('ownerId', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Organization.countDocuments(query),
  ]);

  // Attach current subscription + basic counts to each row — the platform
  // admin list view is useless without knowing who's actually paying.
  const orgIds = organizations.map((o) => o._id);

  const [subscriptions, branchCounts, userCounts] = await Promise.all([
    Subscription.find({ organizationId: { $in: orgIds } })
      .sort({ createdAt: -1 })
      .lean(),
    Branch.aggregate([
      { $match: { organizationId: { $in: orgIds } } },
      { $group: { _id: '$organizationId', count: { $sum: 1 } } },
    ]),
    User.aggregate([
      { $match: { organizationId: { $in: orgIds } } },
      { $group: { _id: '$organizationId', count: { $sum: 1 } } },
    ]),
  ]);

  const latestSubByOrg = new Map();
  for (const sub of subscriptions) {
    const key = sub.organizationId.toString();
    if (!latestSubByOrg.has(key)) latestSubByOrg.set(key, sub);
  }
  const branchCountMap = new Map(branchCounts.map((b) => [b._id.toString(), b.count]));
  const userCountMap = new Map(userCounts.map((u) => [u._id.toString(), u.count]));

  let rows = organizations.map((org) => ({
    ...org,
    subscription: latestSubByOrg.get(org._id.toString()) || null,
    branchCount: branchCountMap.get(org._id.toString()) || 0,
    userCount: userCountMap.get(org._id.toString()) || 0,
  }));

  if (filters.subscriptionStatus) {
    rows = rows.filter((r) => r.subscription?.status === filters.subscriptionStatus);
  }

  return { organizations: rows, meta: buildPaginationMeta({ page, limit, total }) };
}

export async function getOrganizationDetail(organizationId) {
  const organization = await Organization.findById(organizationId).populate(
    'ownerId',
    'name email phone'
  );
  if (!organization) throw ApiError.notFound('Organization not found');

  const [branches, users, subscriptions, orderStats] = await Promise.all([
    Branch.find({ organizationId }).lean(),
    User.find({ organizationId }).populate('roleId', 'key name').select('-passwordHash').lean(),
    Subscription.find({ organizationId }).sort({ createdAt: -1 }).lean(),
    Order.aggregate([
      { $match: { organizationId: new mongoose.Types.ObjectId(organizationId), status: ORDER_STATUS.COMPLETED } },
      { $group: { _id: null, totalOrders: { $sum: 1 }, totalRevenue: { $sum: '$total' } } },
    ]),
  ]);

  return {
    organization,
    branches,
    users,
    subscriptions,
    usage: {
      totalOrders: orderStats[0]?.totalOrders || 0,
      totalRevenue: orderStats[0]?.totalRevenue || 0,
      branchCount: branches.length,
      userCount: users.length,
    },
  };
}

/**
 * Suspending an organization is the platform's enforcement lever for
 * non-payment. Revokes every user's refresh token so nobody stays logged
 * in on an existing session after suspension.
 */
export async function updateOrganizationStatus(organizationId, { status, reason }, superAdminId) {
  const organization = await Organization.findById(organizationId);
  if (!organization) throw ApiError.notFound('Organization not found');

  const oldStatus = organization.status;
  organization.status = status;
  await organization.save();

  if (status !== 'ACTIVE') {
    const users = await User.find({ organizationId }).select('_id').lean();
    await Promise.all(users.map((u) => revokeAllRefreshTokens(u._id.toString())));
  }

  await logAudit({
    organizationId,
    userId: superAdminId,
    action: 'platform.organization_status_changed',
    entityType: 'Organization',
    entityId: organizationId,
    oldValue: { status: oldStatus },
    newValue: { status },
    reason,
  });

  return organization;
}

// ---------- Subscriptions (manual bKash verification, §5) ----------

export async function listPendingVerifications() {
  // Organizations whose subscription is expired/expiring and need attention
  const soon = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  return Subscription.find({
    $or: [
      { status: SUBSCRIPTION_STATUS.EXPIRED },
      { status: { $in: [SUBSCRIPTION_STATUS.TRIAL, SUBSCRIPTION_STATUS.ACTIVE] }, endDate: { $lte: soon } },
    ],
  })
    .populate('organizationId', 'name status')
    .sort({ endDate: 1 })
    .lean();
}

/**
 * The manual bKash flow from §5: restaurant owner sends money to the
 * SaaS bKash number, SuperAdmin confirms it landed, then activates.
 * Creates a NEW subscription record rather than mutating the old one,
 * so billing history stays intact.
 */
export async function verifySubscriptionPayment(input, superAdminId) {
  const { organizationId, planId, amount, paymentReference, periodDays, notes } = input;

  const [organization, plan] = await Promise.all([
    Organization.findById(organizationId),
    Plan.findById(planId),
  ]);

  if (!organization) throw ApiError.notFound('Organization not found');
  if (!plan) throw ApiError.notFound('Plan not found');

  const duplicate = await Subscription.findOne({ paymentReference });
  if (duplicate) {
    throw ApiError.conflict(
      `Payment reference ${paymentReference} has already been recorded — possible duplicate entry`
    );
  }

  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + periodDays * 24 * 60 * 60 * 1000);

  const session = await mongoose.startSession();
  try {
    let subscription;

    await session.withTransaction(async () => {
      // Close out any currently-active subscription
      await Subscription.updateMany(
        {
          organizationId,
          status: { $in: [SUBSCRIPTION_STATUS.TRIAL, SUBSCRIPTION_STATUS.ACTIVE] },
        },
        { $set: { status: SUBSCRIPTION_STATUS.EXPIRED } },
        { session }
      );

      [subscription] = await Subscription.create(
        [
          {
            organizationId,
            planId,
            plan: plan.billingCycle,
            status: SUBSCRIPTION_STATUS.ACTIVE,
            startDate,
            endDate,
            amount,
            paymentReference,
            verifiedBy: superAdminId,
            verifiedAt: new Date(),
            notes,
          },
        ],
        { session }
      );

      // Reactivate the org if it had been suspended for non-payment
      if (organization.status === 'SUSPENDED') {
        organization.status = 'ACTIVE';
        await organization.save({ session });
      }
    });

    await logAudit({
      organizationId,
      userId: superAdminId,
      action: 'platform.subscription_verified',
      entityType: 'Subscription',
      entityId: subscription._id,
      newValue: { plan: plan.key, amount, paymentReference, endDate },
    });

    return subscription;
  } finally {
    await session.endSession();
  }
}

export async function updateSubscriptionStatus(subscriptionId, { status, reason }, superAdminId) {
  const subscription = await Subscription.findById(subscriptionId);
  if (!subscription) throw ApiError.notFound('Subscription not found');

  const oldStatus = subscription.status;
  subscription.status = status;
  await subscription.save();

  await logAudit({
    organizationId: subscription.organizationId,
    userId: superAdminId,
    action: 'platform.subscription_status_changed',
    entityType: 'Subscription',
    entityId: subscriptionId,
    oldValue: { status: oldStatus },
    newValue: { status },
    reason,
  });

  return subscription;
}

// ---------- Platform dashboard ----------

export async function getPlatformStats() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalOrgs,
    activeOrgs,
    suspendedOrgs,
    newOrgsThisMonth,
    subsByStatus,
    revenueAgg,
    totalUsers,
  ] = await Promise.all([
    Organization.countDocuments({}),
    Organization.countDocuments({ status: 'ACTIVE' }),
    Organization.countDocuments({ status: 'SUSPENDED' }),
    Organization.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
    Subscription.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Subscription.aggregate([
      { $match: { status: SUBSCRIPTION_STATUS.ACTIVE, verifiedAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    User.countDocuments({ isSuperAdmin: false }),
  ]);

  const expiringSoon = await Subscription.countDocuments({
    status: { $in: [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.TRIAL] },
    endDate: { $gte: now, $lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
  });

  return {
    organizations: {
      total: totalOrgs,
      active: activeOrgs,
      suspended: suspendedOrgs,
      newLast30Days: newOrgsThisMonth,
    },
    subscriptions: {
      byStatus: subsByStatus.map((s) => ({ status: s._id, count: s.count })),
      expiringWithin7Days: expiringSoon,
    },
    revenue: {
      last30Days: revenueAgg[0]?.total || 0,
      note: 'Sum of verified subscription payments in the last 30 days',
    },
    totalRestaurantUsers: totalUsers,
  };
}

/**
 * Cross-tenant platform-wide activity. Deliberately aggregate-only —
 * the platform admin sees volume and health, not individual restaurants'
 * order contents or customer data.
 */
export async function getPlatformUsageStats({ from, to } = {}) {
  const match = { status: ORDER_STATUS.COMPLETED };
  if (from || to) {
    match.completedAt = {};
    if (from) match.completedAt.$gte = new Date(from);
    if (to) match.completedAt.$lte = new Date(to);
  }

  const byOrg = await Order.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$organizationId',
        orderCount: { $sum: 1 },
        gmv: { $sum: '$total' },
      },
    },
    {
      $lookup: {
        from: 'organizations',
        localField: '_id',
        foreignField: '_id',
        as: 'org',
      },
    },
    { $unwind: '$org' },
    {
      $project: {
        organizationId: '$_id',
        organizationName: '$org.name',
        orderCount: 1,
        gmv: 1,
        _id: 0,
      },
    },
    { $sort: { orderCount: -1 } },
  ]);

  const totals = byOrg.reduce(
    (acc, o) => ({
      orderCount: acc.orderCount + o.orderCount,
      gmv: acc.gmv + o.gmv,
    }),
    { orderCount: 0, gmv: 0 }
  );

  return { byOrganization: byOrg, totals };
}


