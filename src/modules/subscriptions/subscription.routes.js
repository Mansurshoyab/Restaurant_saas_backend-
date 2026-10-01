import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { resolveTenant } from '../../middleware/tenant.middleware.js';
import { authorize } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { uploadImage } from '../../middleware/upload.middleware.js';
import { submitPaymentRequestSchema } from './subscription.validation.js';
import * as subscriptionController from './subscription.controller.js';

const router = Router();

router.use(authenticate, resolveTenant);

router.get('/me', subscriptionController.getMySubscription);
router.get('/plans', subscriptionController.listPlans);

router.post(
  '/payment-requests',
  authorize('settings:manage'),
  uploadImage.single('screenshot'),
  validate({ body: submitPaymentRequestSchema }),
  subscriptionController.submitPaymentRequest
);

router.get('/payment-requests/my', authorize('settings:manage'), subscriptionController.listMyRequests);

export default router;


