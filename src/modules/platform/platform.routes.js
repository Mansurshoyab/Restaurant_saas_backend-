import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireSuperAdmin } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { idempotent } from '../../middleware/idempotency.middleware.js';
import {
  createPlanSchema,
  updatePlanSchema,
  verifyPaymentSchema,
  updateOrgStatusSchema,
  updateSubscriptionStatusSchema,
  listOrganizationsQuerySchema,
} from './platform.validation.js';
import * as platformController from './platform.controller.js';
import { reviewRequestSchema } from './platform.validation.js';



const router = Router();

// NOTE: no resolveTenant here — platform admin operates ACROSS tenants,
// so tenant scoping would be actively wrong. requireSuperAdmin is the
// only gate, and it's checked on every single route in this file.
router.use(authenticate, requireSuperAdmin);

// --- Dashboard ---
router.get('/stats', platformController.getStats);
router.get('/usage', platformController.getUsageStats);

// --- Plans ---
router.get('/plans', platformController.listPlans);
router.post('/plans', validate({ body: createPlanSchema }), platformController.createPlan);
router.patch('/plans/:id', validate({ body: updatePlanSchema }), platformController.updatePlan);
router.delete('/plans/:id', platformController.deactivatePlan);

// --- Organizations (tenant oversight) ---
router.get(
  '/organizations',
  validate({ query: listOrganizationsQuerySchema }),
  platformController.listOrganizations
);
router.get('/organizations/:id', platformController.getOrganizationDetail);
router.patch(
  '/organizations/:id/status',
  validate({ body: updateOrgStatusSchema }),
  platformController.updateOrganizationStatus
);

// --- Subscriptions / manual bKash verification (§5) ---
router.get('/subscriptions/pending', platformController.listPendingVerifications);
router.post(
  '/subscriptions/verify-payment',
  idempotent('verify-subscription-payment'),
  validate({ body: verifyPaymentSchema }),
  platformController.verifyPayment
);
router.patch(
  '/subscriptions/:id/status',
  validate({ body: updateSubscriptionStatusSchema }),
  platformController.updateSubscriptionStatus
);


router.get('/subscription-requests', platformController.listPendingRequests);
router.get('/subscription-requests/:id', platformController.getRequestDetail);
router.post(
  '/subscription-requests/:id/review',
  idempotent('review-subscription-request'),
  validate({ body: reviewRequestSchema }),
  platformController.reviewRequest
);



export default router;


