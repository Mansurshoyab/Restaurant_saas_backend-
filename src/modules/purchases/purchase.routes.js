import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { resolveTenant } from '../../middleware/tenant.middleware.js';
import { authorize } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { idempotent } from '../../middleware/idempotency.middleware.js';
import { createPurchaseOrderSchema, receiveGoodsSchema } from './purchase.validation.js';
import * as purchaseController from './purchase.controller.js';

const router = Router();

router.use(authenticate, resolveTenant, authorize('purchase:manage'));

router.get('/', purchaseController.listPOs);
router.get('/:id', purchaseController.getPO);
router.get('/:id/receipts', purchaseController.listReceipts);

router.post('/', validate({ body: createPurchaseOrderSchema }), purchaseController.createPO);
router.post('/:id/submit', purchaseController.submitPO);
router.post('/:id/approve', purchaseController.approvePO);

router.post(
  '/:id/receive',
  idempotent('goods-receipt'),
  validate({ body: receiveGoodsSchema }),
  purchaseController.receiveGoods
);

export default router;


