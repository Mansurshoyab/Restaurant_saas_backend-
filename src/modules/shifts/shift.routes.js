import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { resolveTenant } from '../../middleware/tenant.middleware.js';
import { authorize } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { openShiftSchema, closeShiftSchema } from './shift.validation.js';
import * as shiftController from './shift.controller.js';

const router = Router();

router.use(authenticate, resolveTenant, authorize('payment:record'));

router.get('/my-open', shiftController.getMyOpenShift);
router.post('/open', validate({ body: openShiftSchema }), shiftController.openShift);
router.post('/close', validate({ body: closeShiftSchema }), shiftController.closeShift);

router.get('/my-summary', shiftController.getShiftSummary);
router.get('/', authorize('report:view'), shiftController.listShifts);
router.get('/:id', authorize('report:view'), shiftController.getShift);

export default router;


