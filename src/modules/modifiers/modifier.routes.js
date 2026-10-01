import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { resolveTenant } from '../../middleware/tenant.middleware.js';
import { authorize } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  createModifierGroupSchema,
  updateModifierGroupSchema,
  createModifierSchema,
  updateModifierSchema,
} from './modifier.validation.js';
import * as modifierController from './modifier.controller.js';

const router = Router();

router.use(authenticate, resolveTenant);

router.get('/groups', modifierController.listGroups);

router.post(
  '/groups',
  authorize('settings:manage'),
  validate({ body: createModifierGroupSchema }),
  modifierController.createGroup
);

router.patch(
  '/groups/:groupId',
  authorize('settings:manage'),
  validate({ body: updateModifierGroupSchema }),
  modifierController.updateGroup
);

router.delete('/groups/:groupId', authorize('settings:manage'), modifierController.deleteGroup);

router.post(
  '/groups/:groupId/modifiers',
  authorize('settings:manage'),
  validate({ body: createModifierSchema }),
  modifierController.addModifier
);

router.patch(
  '/:modifierId',
  authorize('settings:manage'),
  validate({ body: updateModifierSchema }),
  modifierController.updateModifier
);

router.delete('/:modifierId', authorize('settings:manage'), modifierController.deleteModifier);

export default router;


