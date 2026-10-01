import { createQueue, createWorker } from './queue.js';
import { logger } from '../../config/logger.js';
import {
  expireOverdueSubscriptions,
  notifyExpiringSubscriptions,
} from '../../modules/subscriptions/subscription.service.js';

export const subscriptionQueue = createQueue('subscription-expiry-check');

export function registerSubscriptionWorker() {
  createWorker('subscription-expiry-check', async (job) => {
    const [expiredCount, warnedCount] = await Promise.all([
      expireOverdueSubscriptions(),
      notifyExpiringSubscriptions(),
    ]);
    logger.info({ jobId: job.id, expiredCount, warnedCount }, 'Subscription check complete');
  });
}

export async function scheduleSubscriptionCheck() {
  await subscriptionQueue.add(
    'check',
    {},
    { repeat: { every: 24 * 60 * 60 * 1000 }, removeOnComplete: true, removeOnFail: 50 }
  );
}


