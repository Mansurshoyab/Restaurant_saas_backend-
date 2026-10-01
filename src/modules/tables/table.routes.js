import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { resolveTenant } from '../../middleware/tenant.middleware.js';
import { authorize } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  createDiningAreaSchema,
  createTableSchema,
  updateTableSchema,
} from './table.validation.js';
import * as tableController from './table.controller.js';

const router = Router();

router.use(authenticate, resolveTenant);

router.get('/dining-areas', tableController.listDiningAreas);
router.post(
  '/dining-areas',
  authorize('settings:manage'),
  validate({ body: createDiningAreaSchema }),
  tableController.createDiningArea
);

router.get('/', tableController.listTables);
router.get('/:id', tableController.getTable);
router.post(
  '/',
  authorize('settings:manage'),
  validate({ body: createTableSchema }),
  tableController.createTable
);
router.patch(
  '/:id',
  authorize('settings:manage'),
  validate({ body: updateTableSchema }),
  tableController.updateTable
);

export default router;


