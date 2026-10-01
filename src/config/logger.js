import pino from 'pino';
import { env } from './env.js';

export const logger = pino({
  level: env.LOG_LEVEL || 'info',
  // Check process.env directly so Vercel's bundler can statically analyze it
  ...(process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'
    ? {} // No transport in production (fastest, safest JSON logging)
    : {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
        },
      }),
  base: { service: 'restaurant-saas-backend' },
});


