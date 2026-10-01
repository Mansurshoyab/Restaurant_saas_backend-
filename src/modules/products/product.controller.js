import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { success, created } from '../../common/utils/apiResponse.js';
import { ApiError } from '../../common/utils/apiError.js';
import * as productService from './product.service.js';

export const listProducts = asyncHandler(async (req, res) => {
  const products = await productService.listProducts(req.tenant, {
    ...req.query,
    includeInactive: req.query.includeInactive === 'true',
  });
  return success(res, { message: 'Products', data: products });
});

export const getProduct = asyncHandler(async (req, res) => {
  const product = await productService.getProductById(req.tenant, req.params.id);
  return success(res, { message: 'Product', data: product });
});

export const createProduct = asyncHandler(async (req, res) => {
  const product = await productService.createProduct(req.tenant, req.body);
  return created(res, product, 'Product created');
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await productService.updateProduct(
    req.tenant,
    req.params.id,
    req.body,
    req.user.userId
  );
  return success(res, { message: 'Product updated', data: product });
});

export const deactivateProduct = asyncHandler(async (req, res) => {
  await productService.deactivateProduct(req.tenant, req.params.id);
  return success(res, { message: 'Product deactivated' });
});

export const uploadProductImage = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Image file is required');

  const product = await productService.setProductImage(req.tenant, req.params.id, req.file);
  return success(res, { message: 'Product image updated', data: product });
});


