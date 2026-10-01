import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { resolveTenant } from '../../middleware/tenant.middleware.js';
import { authorize } from '../../middleware/rbac.middleware.js';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { success } from '../../common/utils/apiResponse.js';
import { listAuditLogs } from './auditLog.service.js';

const router = Router();

router.get(
  '/',
  authenticate,
  resolveTenant,
  authorize('settings:manage'),
  asyncHandler(async (req, res) => {
    const logs = await listAuditLogs(req.tenant.organizationId, req.query);
    return success(res, { message: 'Audit logs', data: logs });
  })
);

export default router;


