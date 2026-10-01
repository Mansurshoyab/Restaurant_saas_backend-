import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redisClient } from '../config/redis.js';
import { env } from '../config/env.js';

export const rateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  // Per-organization rather than per-IP, so one tenant's traffic
  // spike doesn't degrade another tenant sharing the same NAT/IP.
  keyGenerator: (req) => req.user?.organizationId?.toString() || req.ip,
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
    prefix: 'rl:',
  }),
  message: { success: false, message: 'Too many requests, please try again shortly.' },
});

// Stricter limiter for auth endpoints (login/OTP) to slow brute force
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
    prefix: 'rl:auth:',
  }),
  message: { success: false, message: 'Too many attempts, please try again later.' },
});

