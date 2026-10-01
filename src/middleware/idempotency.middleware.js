import { redisClient } from '../config/redis.js';
import { idempotencyRedisKey } from '../common/utils/idempotencyKey.util.js';
import { ApiError } from '../common/utils/apiError.js';
import { asyncHandler } from '../common/utils/asyncHandler.js';

const LOCK_TTL_SECONDS = 60;
const RESULT_TTL_SECONDS = 24 * 60 * 60;

// Apply to payment/stock-mutating endpoints. Client must send
// "Idempotency-Key" header. Same key + same route replays the first
// response instead of re-executing the handler.
export function idempotent(scope) {
  return asyncHandler(async (req, res, next) => {
    const key = req.headers['idempotency-key'];
    if (!key) {
      throw ApiError.badRequest('Idempotency-Key header is required for this operation');
    }

    const redisKey = idempotencyRedisKey(scope, key);
    const cached = await redisClient.get(redisKey);

    if (cached) {
      const { statusCode, body } = JSON.parse(cached);
      return res.status(statusCode).json(body);
    }

    const lockKey = `${redisKey}:lock`;
    const acquired = await redisClient.set(lockKey, '1', 'EX', LOCK_TTL_SECONDS, 'NX');

    if (!acquired) {
      throw ApiError.conflict('A request with this idempotency key is already being processed');
    }

    // Capture the response to cache it after the handler completes
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      redisClient
        .set(redisKey, JSON.stringify({ statusCode: res.statusCode, body }), 'EX', RESULT_TTL_SECONDS)
        .finally(() => redisClient.del(lockKey));
      return originalJson(body);
    };

    next();
  });
}

