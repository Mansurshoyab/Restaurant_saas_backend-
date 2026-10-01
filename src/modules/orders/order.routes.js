import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.middleware.js';
import { resolveTenant } from '../../middleware/tenant.middleware.js';
import { authorize } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  createOrderSchema,
  addItemsSchema,
  updateItemQuantitySchema,
  cancelOrderSchema,
  applyDiscountSchema,
} from './order.validation.js';
import { ORDER_STATUS } from '../../config/constants.js';
import * as orderController from './order.controller.js';

const router = Router();

router.use(authenticate, resolveTenant);

// Read access: anyone who can either build orders OR update their status
// needs to be able to see them — Kitchen staff must see the order to
// know what to cook, without being able to create new ones.
router.get('/', authorize(['order:create', 'order:update_status']), orderController.listOrders);
router.get('/:id', authorize(['order:create', 'order:update_status']), orderController.getOrder);

// Cart-building and confirming: cashier/waiter territory only
router.post('/', authorize('order:create'), validate({ body: createOrderSchema }), orderController.createOrder);
router.post('/:id/items', authorize('order:create'), validate({ body: addItemsSchema }), orderController.addItems);
router.patch('/:id/items/:itemId', authorize('order:create'), validate({ body: updateItemQuantitySchema }), orderController.updateItemQuantity);
router.patch('/:id/discount', authorize('order:create'), validate({ body: applyDiscountSchema }), orderController.applyDiscount);
router.post('/:id/confirm', authorize('order:create'), orderController.confirmOrder);

// Status progression: Kitchen, Waiter, Cashier, BranchManager, OrgAdmin —
// anyone with either permission can advance CONFIRMED→PREPARING→READY→SERVED
router.patch(
  '/:id/status',
  authorize(['order:create', 'order:update_status']),
  validate({ body: z.object({ status: z.enum(Object.values(ORDER_STATUS)) }) }),
  orderController.updateStatus
);

router.post('/:id/cancel', authorize('order:cancel'), validate({ body: cancelOrderSchema }), orderController.cancelOrder);

export default router;


