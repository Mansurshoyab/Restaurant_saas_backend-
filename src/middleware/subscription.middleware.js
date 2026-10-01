import { Subscription } from '../modules/subscriptions/subscription.model.js';
import { Organization } from '../modules/organizations/organization.model.js';
import { ApiError } from '../common/utils/apiError.js';
import { asyncHandler } from '../common/utils/asyncHandler.js';
import { SUBSCRIPTION_STATUS } from '../config/constants.js';
import { redisClient } from '../config/redis.js';

const CACHE_TTL_SECONDS = 60;

/**
 * Blocks write operations for organizations whose subscription has
 * lapsed or whose account is suspended. Deliberately NOT applied to
 * read-only routes — a restaurant that stops paying should still be
 * able to see its own historical data and reports, just not keep
 * ringing up new sales.
 *
 * Cached in Redis for 60s so this doesn't add a DB round trip to
 * every POS write during service hours.
 */
export const requireActiveSubscription = asyncHandler(async (req, res, next) => {
  if (req.user?.isSuperAdmin) return next();

  const organizationId = req.tenant?.organizationId;
  if (!organizationId) throw ApiError.forbidden('No organization context');

  const cacheKey = `sub:active:${organizationId}`;
  const cached = await redisClient.get(cacheKey);

  if (cached === 'ok') return next();
  if (cached === 'blocked') {
    throw ApiError.forbidden(
      'Your subscription has expired or your account is suspended. Please contact support to reactivate.'
    );
  }

  const [organization, subscription] = await Promise.all([
    Organization.findById(organizationId).select('status').lean(),
    Subscription.findOne({ organizationId }).sort({ createdAt: -1 }).lean(),
  ]);

  const orgOk = organization?.status === 'ACTIVE';
  const subOk =
    subscription &&
    [SUBSCRIPTION_STATUS.TRIAL, SUBSCRIPTION_STATUS.ACTIVE].includes(subscription.status) &&
    new Date(subscription.endDate) > new Date();

  const allowed = orgOk && subOk;

  await redisClient.set(cacheKey, allowed ? 'ok' : 'blocked', 'EX', CACHE_TTL_SECONDS);

  if (!allowed) {
    throw ApiError.forbidden(
      'Your subscription has expired or your account is suspended. Please contact support to reactivate.'
    );
  }

  next();
});


