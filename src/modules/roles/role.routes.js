import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { resolveTenant } from '../../middleware/tenant.middleware.js';
import { authorize } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { createRoleSchema, updateRoleSchema } from './role.validation.js';
import * as roleController from './role.controller.js';

const router = Router();

router.use(authenticate, resolveTenant);

// Read access: anyone managing staff needs to see roles (e.g. BranchManager
// assigning a Waiter), so this only requires 'user:manage', not a
// separate stricter permission.
router.get('/', authorize('user:manage'), roleController.listRoles);
router.get('/permissions', authorize('user:manage'), roleController.listPermissions);
router.get('/:id', authorize('user:manage'), roleController.getRole);

// Write access: creating/editing custom roles is a settings-level action.
router.post(
  '/',
  authorize('settings:manage'),
  validate({ body: createRoleSchema }),
  roleController.createRole
);

router.patch(
  '/:id',
  authorize('settings:manage'),
  validate({ body: updateRoleSchema }),
  roleController.updateRole
);

router.delete('/:id', authorize('settings:manage'), roleController.deleteRole);

export default router;


