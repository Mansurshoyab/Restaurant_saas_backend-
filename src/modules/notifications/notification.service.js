import { Notification } from './notification.model.js';

export async function createNotification({ organizationId, branchId, type, title, message, data }) {
  return Notification.create({ organizationId, branchId, type, title, message, data });
}

export async function listNotifications(organizationId, { unreadOnly = false } = {}) {
  const query = { organizationId };
  if (unreadOnly) query.isRead = false;
  return Notification.find(query).sort({ createdAt: -1 }).limit(100);
}

export async function markAsRead(organizationId, notificationId) {
  return Notification.findOneAndUpdate(
    { _id: notificationId, organizationId },
    { isRead: true },
    { new: true }
  );
}

export async function markAllAsRead(organizationId) {
  await Notification.updateMany({ organizationId, isRead: false }, { isRead: true });
}


