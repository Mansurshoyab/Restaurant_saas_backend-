import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { success } from '../../common/utils/apiResponse.js';
import * as notificationService from './notification.service.js';

export const listNotifications = asyncHandler(async (req, res) => {
  const notifications = await notificationService.listNotifications(req.tenant.organizationId, {
    unreadOnly: req.query.unreadOnly === 'true',
  });
  return success(res, { message: 'Notifications', data: notifications });
});

export const markAsRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markAsRead(req.tenant.organizationId, req.params.id);
  return success(res, { message: 'Marked as read', data: notification });
});

export const markAllAsRead = asyncHandler(async (req, res) => {
  await notificationService.markAllAsRead(req.tenant.organizationId);
  return success(res, { message: 'All notifications marked as read' });
});


