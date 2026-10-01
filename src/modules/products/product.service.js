import { MenuProduct } from './product.model.js';
import { Category } from '../categories/category.model.js';
import { ApiError } from '../../common/utils/apiError.js';
import { uploadToR2, deleteFromR2 } from '../../common/utils/storage.util.js';
import { logAudit } from '../audit/auditLog.service.js';

async function assertCategoryExists(tenant, categoryId) {
  const category = await Category.findById(categoryId).setOptions({ tenant });
  if (!category) throw ApiError.badRequest('Category not found');
}

export async function listProducts(tenant, filters = {}) {
  const query = {};

  if (!filters.includeInactive) query.isActive = true;
  if (filters.categoryId) query.categoryId = filters.categoryId;
  if (filters.branchId) {
    query.$or = [{ availableBranches: { $size: 0 } }, { availableBranches: filters.branchId }];
  }
  if (filters.search) {
    query.name = { $regex: filters.search, $options: 'i' };
  }

  return MenuProduct.find(query)
    .populate('categoryId', 'name')
    .sort({ name: 1 })
    .setOptions({ tenant });
}

export async function getProductById(tenant, productId) {
  const product = await MenuProduct.findById(productId)
    .populate('categoryId', 'name')
    .populate('modifierGroupIds')
    .setOptions({ tenant });

  if (!product) throw ApiError.notFound('Product not found');
  return product;
}

export async function createProduct(tenant, input) {
  await assertCategoryExists(tenant, input.categoryId);

  return MenuProduct.create({ ...input, organizationId: tenant.organizationId });
}

export async function updateProduct(tenant, productId, updates, userId) {
  if (updates.categoryId) {
    await assertCategoryExists(tenant, updates.categoryId);
  }

  const before = await MenuProduct.findById(productId).setOptions({ tenant }).lean();
  if (!before) throw ApiError.notFound('Product not found');

  const product = await MenuProduct.findOneAndUpdate({ _id: productId }, updates, {
    new: true,
    runValidators: true,
  }).setOptions({ tenant });

  if (updates.price !== undefined && updates.price !== before.price) {
    await logAudit({
      organizationId: tenant.organizationId,
      branchId: tenant.branchId,
      userId,
      action: 'product.price_changed',
      entityType: 'MenuProduct',
      entityId: productId,
      oldValue: { price: before.price },
      newValue: { price: updates.price },
    });
  }

  return product;
}

export async function deactivateProduct(tenant, productId) {
  const product = await MenuProduct.findOneAndUpdate(
    { _id: productId },
    { isActive: false }
  ).setOptions({ tenant });
  if (!product) throw ApiError.notFound('Product not found');
  return true;
}

/**
 * Replaces the product image: uploads new file to R2, deletes the old
 * object (if any) only after the new upload succeeds, so a failed
 * upload never leaves the product without an image.
 */
export async function setProductImage(tenant, productId, file) {
  const product = await MenuProduct.findById(productId).setOptions({ tenant });
  if (!product) throw ApiError.notFound('Product not found');

  const { key, url } = await uploadToR2({
    organizationId: tenant.organizationId,
    folder: 'products',
    file,
  });

  const oldKey = product.imageKey;

  product.imageKey = key;
  product.imageUrl = url;
  await product.save();

  if (oldKey) {
    await deleteFromR2(oldKey).catch(() => {});
  }

  return product;
}



