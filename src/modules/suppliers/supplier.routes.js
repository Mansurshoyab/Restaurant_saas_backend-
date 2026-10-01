import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { resolveTenant } from '../../middleware/tenant.middleware.js';
import { authorize } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { createSupplierSchema, updateSupplierSchema } from './supplier.validation.js';
import * as supplierController from './supplier.controller.js';

const router = Router();

router.use(authenticate, resolveTenant, authorize('purchase:manage'));

router.get('/', supplierController.listSuppliers);
router.get('/:id', supplierController.getSupplier);
router.post('/', validate({ body: createSupplierSchema }), supplierController.createSupplier);
router.patch('/:id', validate({ body: updateSupplierSchema }), supplierController.updateSupplier);
router.delete('/:id', supplierController.deactivateSupplier);

export default router;


