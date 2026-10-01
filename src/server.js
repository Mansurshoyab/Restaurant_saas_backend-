import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { connectDatabase } from './config/database.js';
// Workers and schedulers are imported but restricted to local development
import { registerLowStockWorker, scheduleLowStockCheck } from './common/jobs/lowStockCheck.job.js';
import { registerSubscriptionWorker, scheduleSubscriptionCheck } from './common/jobs/subscriptionExpiry.job.js';
import { registerNotificationSubscribers } from './modules/notifications/notification.subscribers.js';

// 1. Establish the database connection globally. 
// Vercel reuses this connection across "warm" serverless invocations.
connectDatabase().catch((err) => {
  logger.error({ err }, 'Database connection failed');
});

const app = createApp();

// 2. Isolate persistent processes and listeners to Local Development only
if (env.NODE_ENV !== 'production') {
  // Start background jobs and workers ONLY locally
  registerLowStockWorker();
  registerSubscriptionWorker();
  registerNotificationSubscribers();
  scheduleLowStockCheck().catch(console.error);
  scheduleSubscriptionCheck().catch(console.error);

  const PORT = env.PORT || 3000;
  app.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT} [${env.NODE_ENV}]`);
  });
}

// 3. Export the Express app for Vercel's Serverless Functions
export default app;