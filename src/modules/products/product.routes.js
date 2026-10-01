import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { resolveTenant } from '../../middleware/tenant.middleware.js';
import { authorize } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { uploadImage } from '../../middleware/upload.middleware.js';
import {
  createProductSchema,
  updateProductSchema,
  listProductsQuerySchema,
} from './product.validation.js';
import * as productController from './product.controller.js';

const router = Router();

router.use(authenticate, resolveTenant);

router.get(
  '/',
  validate({ query: listProductsQuerySchema }),
  productController.listProducts
);
router.get('/:id', productController.getProduct);

router.post(
  '/',
  authorize('settings:manage'),
  validate({ body: createProductSchema }),
  productController.createProduct
);

router.patch(
  '/:id',
  authorize('settings:manage'),
  validate({ body: updateProductSchema }),
  productController.updateProduct
);

router.delete('/:id', authorize('settings:manage'), productController.deactivateProduct);

router.post(
  '/:id/image',
  authorize('settings:manage'),
  uploadImage.single('image'),
  productController.uploadProductImage
);

export default router;


