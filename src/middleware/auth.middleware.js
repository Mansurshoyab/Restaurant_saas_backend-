import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from '../common/utils/apiError.js';
import { asyncHandler } from '../common/utils/asyncHandler.js';

export const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Missing or malformed Authorization header');
  }

  const token = header.split(' ')[1];

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
  } catch (err) {
    throw ApiError.unauthorized('Invalid or expired access token');
  }

  // Expected payload shape set at token-issue time (auth.service.js):
  // { userId, organizationId, branchId, roleId, isSuperAdmin }
  req.user = payload;
  next();
});

// For endpoints usable by SuperAdmin without an organization context
export const authenticateAny = authenticate;

export const requireSuperAdmin = (req, res, next) => {
  if (!req.user || !req.user.isSuperAdmin) {
    return next(ApiError.forbidden('SuperAdmin access required'));
  }
  next();
};

