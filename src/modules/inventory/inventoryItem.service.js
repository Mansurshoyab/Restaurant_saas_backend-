import { InventoryItem } from './inventoryItem.model.js';
import { StockBalance } from '../stock/stockBalance.model.js';
import { ApiError } from '../../common/utils/apiError.js';

export async function listInventoryItems(tenant, { includeInactive = false, categoryId } = {}) {
  const query = {};
  if (!includeInactive) query.isActive = true;
  if (categoryId) query.categoryId = categoryId;

  return InventoryItem.find(query)
    .populate('categoryId', 'name')
    .sort({ name: 1 })
    .setOptions({ tenant });
}

export async function getInventoryItemById(tenant, itemId) {
  const item = await InventoryItem.findById(itemId).populate('categoryId', 'name').setOptions({ tenant });
  if (!item) throw ApiError.notFound('Inventory item not found');
  return item;
}

export async function createInventoryItem(tenant, input) {
  const item = await InventoryItem.create({ ...input, organizationId: tenant.organizationId });

  // Auto-create a zero-balance StockBalance row for the current branch so
  // low-stock queries and stock listings never have to handle "missing" rows.
  if (tenant.branchId) {
    await StockBalance.create({
      organizationId: tenant.organizationId,
      branchId: tenant.branchId,
      inventoryItemId: item._id,
      quantity: 0,
    }).catch(() => {
      // Duplicate key on (branch,item) unique index — harmless, ignore.
    });
  }

  return item;
}

export async function updateInventoryItem(tenant, itemId, updates) {
  const item = await InventoryItem.findOneAndUpdate({ _id: itemId }, updates, {
    new: true,
    runValidators: true,
  }).setOptions({ tenant });
  if (!item) throw ApiError.notFound('Inventory item not found');
  return item;
}

export async function deactivateInventoryItem(tenant, itemId) {
  const item = await InventoryItem.findOneAndUpdate(
    { _id: itemId },
    { isActive: false }
  ).setOptions({ tenant });
  if (!item) throw ApiError.notFound('Inventory item not found');
  return true;
}
export async function deleteInventoryItem(tenant, itemId) {
  const item = await InventoryItem.findOne({ _id: itemId }).setOptions({ tenant });
  if (!item) throw ApiError.notFound('Inventory item not found');

  await InventoryItem.deleteOne({ _id: itemId }).setOptions({ tenant });

  await StockBalance.deleteMany({
    inventoryItemId: itemId,
    organizationId: tenant.organizationId
  }).setOptions({ tenant });

  return true;
}
