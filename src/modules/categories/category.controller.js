import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { success, created } from '../../common/utils/apiResponse.js';
import * as categoryService from './category.service.js';

export const listCategories = asyncHandler(async (req, res) => {
  const categories = await categoryService.listCategories(req.tenant, {
    includeInactive: req.query.includeInactive === 'true',
  });
  return success(res, { message: 'Categories', data: categories });
});

export const getCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.getCategoryById(req.tenant, req.params.id);
  return success(res, { message: 'Category', data: category });
});

export const createCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.createCategory(req.tenant, req.body);
  return created(res, category, 'Category created');
});

export const updateCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.updateCategory(req.tenant, req.params.id, req.body);
  return success(res, { message: 'Category updated', data: category });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  await categoryService.deleteCategory(req.tenant, req.params.id);
  return success(res, { message: 'Category deactivated' });
});

