import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { resolveTenant } from '../../middleware/tenant.middleware.js';
import { authorize } from '../../middleware/rbac.middleware.js';
import * as reportController from './report.controller.js';

const router = Router();

router.use(authenticate, resolveTenant, authorize('report:view'));

router.get('/sales', reportController.salesReport);
router.get('/sales/timeseries', reportController.salesTimeseries);
router.get('/payments', reportController.paymentReport);
router.get('/products', reportController.productReport);
router.get('/inventory/valuation', reportController.inventoryValuation);
router.get('/inventory/movement', reportController.inventoryMovement);
router.get('/waste', reportController.wasteReport);
router.get('/profitability', reportController.profitabilityReport);

export default router;


