import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { resolveTenant } from '../../middleware/tenant.middleware.js';
import { authorize } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { uploadImage } from '../../middleware/upload.middleware.js';
import { updateSettingsSchema } from './settings.validation.js';
import * as settingsController from './settings.controller.js';

const router = Router();

router.use(authenticate, resolveTenant);

router.get('/', settingsController.getSettings);
router.patch(
  '/',
  authorize('settings:manage'),
  validate({ body: updateSettingsSchema }),
  settingsController.updateSettings
);

router.post(
  '/logo',
  authorize('settings:manage'),
  uploadImage.single('logo'),
  settingsController.uploadLogo
);

export default router;
