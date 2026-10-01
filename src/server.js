import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { redisClient } from './config/redis.js';
import {
  registerLowStockWorker,
  scheduleLowStockCheck,
} from './common/jobs/lowStockCheck.job.js';
import {
  registerSubscriptionWorker,
  scheduleSubscriptionCheck,
} from './common/jobs/subscriptionExpiry.job.js';
import { registerNotificationSubscribers } from './modules/notifications/notification.subscribers.js';

async function bootstrap() {
  await connectDatabase();

  registerLowStockWorker();
  registerSubscriptionWorker();
  registerNotificationSubscribers();
  await scheduleLowStockCheck();
  await scheduleSubscriptionCheck();

  const app = createApp();

  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 Server running on port ${env.PORT} [${env.NODE_ENV}]`);
  });

  const shutdown = async (signal) => {
    logger.info(`${signal} received, shutting down gracefully...`);
    server.close(async () => {
      await disconnectDatabase();
      await redisClient.quit();
      logger.info('Shutdown complete');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled promise rejection');
  });
}

bootstrap();


