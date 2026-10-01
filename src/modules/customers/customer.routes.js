import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { resolveTenant } from '../../middleware/tenant.middleware.js';
import * as customerController from './customer.controller.js';

const router = Router();

router.use(authenticate, resolveTenant);

router.get('/', customerController.listCustomers);
router.get('/:id', customerController.getCustomer);

export default router;


