import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { resolveTenant } from '../../middleware/tenant.middleware.js';
import { authorize } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { createBranchSchema, updateBranchSchema } from './branch.validation.js';
import * as branchController from './branch.controller.js';

const router = Router();

router.use(authenticate, resolveTenant);

router.get('/', branchController.listBranches);
router.get('/:id', branchController.getBranch);

router.post(
  '/',
  authorize('settings:manage'),
  validate({ body: createBranchSchema }),
  branchController.createBranch
);

router.patch(
  '/:id',
  authorize('settings:manage'),
  validate({ body: updateBranchSchema }),
  branchController.updateBranch
);

router.delete('/:id', authorize('settings:manage'), branchController.deactivateBranch);

export default router;

