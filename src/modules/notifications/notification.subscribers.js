import { subscribe } from '../../common/events/eventBus.js';
import { EVENTS } from '../../common/events/eventTypes.js';
import { createNotification } from './notification.service.js';
import { logger } from '../../config/logger.js';

export function registerNotificationSubscribers() {
  subscribe(EVENTS.STOCK_LOW, async (payload) => {
    await createNotification({
      organizationId: payload.organizationId,
      branchId: payload.branchId,
      type: EVENTS.STOCK_LOW,
      title: 'Low Stock Alert',
      message: `${payload.itemName} is below reorder level (${payload.currentQuantity} left, reorder at ${payload.reorderLevel})`,
      data: payload,
    });
  });

  subscribe(EVENTS.PURCHASE_RECEIVED, async (payload) => {
    await createNotification({
      organizationId: payload.organizationId,
      branchId: payload.branchId,
      type: EVENTS.PURCHASE_RECEIVED,
      title: 'Purchase Received',
      message: `Purchase order is now ${payload.status}`,
      data: payload,
    });
  });

  subscribe(EVENTS.SUBSCRIPTION_EXPIRING, async (payload) => {
    await createNotification({
      organizationId: payload.organizationId,
      branchId: null,
      type: EVENTS.SUBSCRIPTION_EXPIRING,
      title: 'Subscription Expiring Soon',
      message: `Your subscription expires on ${payload.endDate}`,
      data: payload,
    });
  });

  logger.info('Notification subscribers registered');
}



