import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { resolveTenant } from '../../middleware/tenant.middleware.js';
import { authorize } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { upsertRecipeSchema } from './recipe.validation.js';
import * as recipeController from './recipe.controller.js';

const router = Router();

router.use(authenticate, resolveTenant);

router.get('/product/:productId', recipeController.getActiveRecipe);
router.get('/product/:productId/versions', recipeController.listVersions);
router.get('/product/:productId/cost', recipeController.getCost);

router.post(
  '/',
  authorize('inventory:manage'),
  validate({ body: upsertRecipeSchema }),
  recipeController.upsertRecipe
);

export default router;


