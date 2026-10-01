import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { success, created } from '../../common/utils/apiResponse.js';
import * as inventoryItemService from './inventoryItem.service.js';

export const listItems = asyncHandler(async (req, res) => {
  const items = await inventoryItemService.listInventoryItems(req.tenant, {
    includeInactive: req.query.includeInactive === 'true',
    categoryId: req.query.categoryId,
  });
  return success(res, { message: 'Inventory items', data: items });
});

export const getItem = asyncHandler(async (req, res) => {
  const item = await inventoryItemService.getInventoryItemById(req.tenant, req.params.id);
  return success(res, { message: 'Inventory item', data: item });
});

export const createItem = asyncHandler(async (req, res) => {
  const item = await inventoryItemService.createInventoryItem(req.tenant, req.body);
  return created(res, item, 'Inventory item created');
});

export const updateItem = asyncHandler(async (req, res) => {
  const item = await inventoryItemService.updateInventoryItem(req.tenant, req.params.id, req.body);
  return success(res, { message: 'Inventory item updated', data: item });
});

export const deactivateItem = asyncHandler(async (req, res) => {
  await inventoryItemService.deactivateInventoryItem(req.tenant, req.params.id);
  return success(res, { message: 'Inventory item deactivated' });
});

export const deleteItem = asyncHandler(async (req, res) => {
  await inventoryItemService.deleteInventoryItem(req.tenant, req.params.id);
  return success(res, { message: 'Inventory item permanently deleted' });
});
