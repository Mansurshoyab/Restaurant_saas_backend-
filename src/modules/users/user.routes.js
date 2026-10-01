import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { resolveTenant } from '../../middleware/tenant.middleware.js';
import { authorize } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  createStaffSchema,
  updateStaffSchema,
  resetPasswordSchema,
} from './user.validation.js';
import * as userController from './user.controller.js';

const router = Router();

router.use(authenticate, resolveTenant, authorize('user:manage'));

router.get('/', userController.listStaff);
router.get('/:id', userController.getStaff);

router.post('/', validate({ body: createStaffSchema }), userController.createStaff);

router.patch('/:id', validate({ body: updateStaffSchema }), userController.updateStaff);

router.post(
  '/:id/reset-password',
  validate({ body: resetPasswordSchema }),
  userController.resetPassword
);

router.delete('/:id', userController.deactivateStaff);

export default router;


