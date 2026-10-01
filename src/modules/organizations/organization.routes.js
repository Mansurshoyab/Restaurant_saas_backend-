import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { resolveTenant } from '../../middleware/tenant.middleware.js';
import { authorize } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { updateOrganizationSchema } from './organization.validation.js';
import * as organizationController from './organization.controller.js';

const router = Router();

router.get('/me', authenticate, resolveTenant, organizationController.getMyOrganization);

router.patch(
  '/me',
  authenticate,
  resolveTenant,
  authorize('settings:manage'),
  validate({ body: updateOrganizationSchema }),
  organizationController.updateMyOrganization
);

export default router;

