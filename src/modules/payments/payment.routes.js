import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { resolveTenant } from '../../middleware/tenant.middleware.js';
import { authorize } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { idempotent } from '../../middleware/idempotency.middleware.js';
import { payOrderSchema, refundSchema } from './payment.validation.js';
import * as paymentController from './payment.controller.js';
import { requireActiveSubscription } from '../../middleware/subscription.middleware.js';

const router = Router();

router.use(authenticate, resolveTenant);

router.get(
  '/order/:orderId',
  authorize('payment:record'),
  paymentController.listPayments
);

// Idempotency-Key header REQUIRED — see idempotency.middleware.js and §28.
// A double-tap "Pay" from the cashier must never double-charge or
// double-consume stock.
router.post(
  '/',
  authorize('payment:record'),
  requireActiveSubscription,
  idempotent('pay-order'),
  validate({ body: payOrderSchema }),
  paymentController.payOrder
);

router.post(
  '/refund',
  authorize('order:cancel'), // refunds are a manager-level action, gated the same as cancellation
  validate({ body: refundSchema }),
  paymentController.refundOrder
);

export default router;


