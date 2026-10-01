import { Category } from './category.model.js';
import { ApiError } from '../../common/utils/apiError.js';

// tenant option required on every query — see tenantScope.plugin.js
export async function listCategories(tenant, { includeInactive = false } = {}) {
  const filter = includeInactive ? {} : { isActive: true };
  return Category.find(filter).sort({ sortOrder: 1, name: 1 }).setOptions({ tenant });
}

export async function getCategoryById(tenant, categoryId) {
  const category = await Category.findById(categoryId).setOptions({ tenant });
  if (!category) throw ApiError.notFound('Category not found');
  return category;
}

export async function createCategory(tenant, input) {
  const existing = await Category.findOne({ name: input.name }).setOptions({ tenant });
  if (existing) throw ApiError.conflict('A category with this name already exists');

  return Category.create({ ...input, organizationId: tenant.organizationId });
}

export async function updateCategory(tenant, categoryId, updates) {
  const category = await Category.findOneAndUpdate({ _id: categoryId }, updates, {
    new: true,
    runValidators: true,
  }).setOptions({ tenant });

  if (!category) throw ApiError.notFound('Category not found');
  return category;
}

export async function deleteCategory(tenant, categoryId) {
  const result = await Category.findOneAndUpdate(
    { _id: categoryId },
    { isActive: false }
  ).setOptions({ tenant });

  if (!result) throw ApiError.notFound('Category not found');
  return true;
}

