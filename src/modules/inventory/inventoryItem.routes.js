import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { resolveTenant } from '../../middleware/tenant.middleware.js';
import { authorize } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  createInventoryItemSchema,
  updateInventoryItemSchema,
} from './inventoryItem.validation.js';
import * as inventoryItemController from './inventoryItem.controller.js';

const router = Router();

router.use(authenticate, resolveTenant);

router.get('/', inventoryItemController.listItems);
router.get('/:id', inventoryItemController.getItem);

router.post(
  '/',
  authorize('inventory:manage'),
  validate({ body: createInventoryItemSchema }),
  inventoryItemController.createItem
);

router.patch(
  '/:id',
  authorize('inventory:manage'),
  validate({ body: updateInventoryItemSchema }),
  inventoryItemController.updateItem
);

router.delete('/:id', authorize('inventory:manage'), inventoryItemController.deactivateItem);
router.delete('/:id/delete', authorize('inventory:manage'), inventoryItemController.deleteItem);

export default router;


