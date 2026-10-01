import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../../config/env.js';
import { redisClient } from '../../config/redis.js';

const REFRESH_PREFIX = 'refresh:';

function refreshKey(userId, jti) {
  return `${REFRESH_PREFIX}${userId}:${jti}`;
}

function expiresInToSeconds(str) {
  // supports simple '15m' / '30d' / '3600' formats used in env
  const match = /^(\d+)([smhd])?$/.exec(str);
  if (!match) return 900;
  const value = parseInt(match[1], 10);
  const unit = match[2] || 's';
  const multipliers = { s: 1, m: 60, h: 3600, d: 86400 };
  return value * multipliers[unit];
}

// Payload embeds resolved role/permissions so most requests never need
// a DB round trip for authorization — see rbac.middleware.js.
export function buildAccessTokenPayload(user, role) {
  return {
    userId: user._id.toString(),
    organizationId: user.organizationId?.toString() || null,
    branchId: user.branchId?.toString() || null,
    roleId: user.roleId?.toString() || null,
    role: role?.key || null,
    permissions: role?.permissions || [],
    isSuperAdmin: user.isSuperAdmin,
  };
}

export function signAccessToken(payload) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES_IN });
}

export async function issueRefreshToken(userId) {
  const jti = uuidv4();
  const token = jwt.sign({ userId, jti }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  });

  await redisClient.set(
    refreshKey(userId, jti),
    '1',
    'EX',
    expiresInToSeconds(env.JWT_REFRESH_EXPIRES_IN)
  );

  return token;
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET); // throws on invalid/expired
}

export async function isRefreshTokenActive(userId, jti) {
  const exists = await redisClient.get(refreshKey(userId, jti));
  return Boolean(exists);
}

export async function revokeRefreshToken(userId, jti) {
  await redisClient.del(refreshKey(userId, jti));
}

export async function revokeAllRefreshTokens(userId) {
  const keys = await redisClient.keys(`${REFRESH_PREFIX}${userId}:*`);
  if (keys.length) await redisClient.del(...keys);
}

