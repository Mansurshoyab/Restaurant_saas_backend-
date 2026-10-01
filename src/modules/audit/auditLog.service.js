import { AuditLog } from './auditLog.model.js';
import { logger } from '../../config/logger.js';

/**
 * Fire-and-forget by design — an audit write failing should never break
 * the business operation it's logging. Call this AFTER the primary
 * mutation succeeds, never inside the same transaction (keeps the core
 * transaction lean and avoids audit-write contention blocking payments).
 */
export async function logAudit({
  organizationId,
  branchId = null,
  userId,
  action,
  entityType,
  entityId,
  oldValue = null,
  newValue = null,
  reason = null,
}) {
  try {
    await AuditLog.create({
      organizationId,
      branchId,
      userId,
      action,
      entityType,
      entityId,
      oldValue,
      newValue,
      reason,
    });
  } catch (err) {
    logger.error({ err, action, entityType, entityId }, 'Failed to write audit log');
  }
}

export async function listAuditLogs(organizationId, { entityType, entityId, userId, from, to } = {}) {
  const query = { organizationId };
  if (entityType) query.entityType = entityType;
  if (entityId) query.entityId = entityId;
  if (userId) query.userId = userId;
  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(from);
    if (to) query.createdAt.$lte = new Date(to);
  }
  return AuditLog.find(query).populate('userId', 'name').sort({ createdAt: -1 }).limit(500);
}


