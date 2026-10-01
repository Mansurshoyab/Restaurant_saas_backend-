import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { resolveTenant } from '../../middleware/tenant.middleware.js';
import { authorize } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  wasteSchema,
  adjustmentSchema,
  transferSchema,
  reorderLevelsSchema,
  listTransactionsQuerySchema,
} from './stock.validation.js';
import * as stockController from './stock.controller.js';

const router = Router();

router.use(authenticate, resolveTenant, authorize('inventory:manage'));

router.get('/balances', stockController.listBalances);
router.get('/balances/:itemId', stockController.getBalance);
router.patch(
  '/balances/:itemId/reorder-levels',
  validate({ body: reorderLevelsSchema }),
  stockController.setReorderLevels
);

router.post('/waste', validate({ body: wasteSchema }), stockController.recordWaste);
router.post('/adjustments', validate({ body: adjustmentSchema }), stockController.recordAdjustment);
router.post('/transfers', validate({ body: transferSchema }), stockController.recordTransfer);

router.get(
  '/transactions',
  validate({ query: listTransactionsQuerySchema }),
  stockController.listTransactions
);

export default router;


