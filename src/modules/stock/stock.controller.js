import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { success, created } from '../../common/utils/apiResponse.js';
import * as stockService from './stock.service.js';

export const listBalances = asyncHandler(async (req, res) => {
  const balances = await stockService.listStockBalances(req.tenant, {
    lowStockOnly: req.query.lowStockOnly === 'true',
  });
  return success(res, { message: 'Stock balances', data: balances });
});

export const getBalance = asyncHandler(async (req, res) => {
  const balance = await stockService.getStockBalance(req.tenant, req.params.itemId);
  return success(res, { message: 'Stock balance', data: balance });
});

export const setReorderLevels = asyncHandler(async (req, res) => {
  const balance = await stockService.setReorderLevels(req.tenant, req.params.itemId, req.body);
  return success(res, { message: 'Reorder levels updated', data: balance });
});

export const recordWaste = asyncHandler(async (req, res) => {
  const result = await stockService.recordWaste({
    tenant: req.tenant,
    createdBy: req.user.userId,
    ...req.body,
  });
  return created(res, result, 'Waste recorded');
});

export const recordAdjustment = asyncHandler(async (req, res) => {
  const result = await stockService.recordAdjustment({
    tenant: req.tenant,
    createdBy: req.user.userId,
    ...req.body,
  });
  return created(res, result, 'Stock adjustment recorded');
});

export const recordTransfer = asyncHandler(async (req, res) => {
  const result = await stockService.recordTransfer({
    organizationId: req.tenant.organizationId,
    fromBranchId: req.tenant.branchId,
    toBranchId: req.body.toBranchId,
    inventoryItemId: req.body.inventoryItemId,
    quantity: req.body.quantity,
    createdBy: req.user.userId,
  });
  return created(res, result, 'Stock transfer completed');
});

export const listTransactions = asyncHandler(async (req, res) => {
  const transactions = await stockService.listStockTransactions(req.tenant, req.query);
  return success(res, { message: 'Stock transactions', data: transactions });
});


