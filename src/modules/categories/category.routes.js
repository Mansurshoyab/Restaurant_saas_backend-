import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { resolveTenant } from '../../middleware/tenant.middleware.js';
import { authorize } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { createCategorySchema, updateCategorySchema } from './category.validation.js';
import * as categoryController from './category.controller.js';

const router = Router();

router.use(authenticate, resolveTenant);

router.get('/', categoryController.listCategories);
router.get('/:id', categoryController.getCategory);

router.post(
  '/',
  authorize('settings:manage'),
  validate({ body: createCategorySchema }),
  categoryController.createCategory
);

router.patch(
  '/:id',
  authorize('settings:manage'),
  validate({ body: updateCategorySchema }),
  categoryController.updateCategory
);

router.delete('/:id', authorize('settings:manage'), categoryController.deleteCategory);

export default router;


