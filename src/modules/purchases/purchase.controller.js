import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { success, created } from '../../common/utils/apiResponse.js';
import * as purchaseService from './purchase.service.js';

export const createPO = asyncHandler(async (req, res) => {
  const po = await purchaseService.createPurchaseOrder(req.tenant, req.user.userId, req.body);
  return created(res, po, 'Purchase order created');
});

export const listPOs = asyncHandler(async (req, res) => {
  const pos = await purchaseService.listPurchaseOrders(req.tenant, req.query);
  return success(res, { message: 'Purchase orders', data: pos });
});

export const getPO = asyncHandler(async (req, res) => {
  const po = await purchaseService.getPurchaseOrderById(req.tenant, req.params.id);
  return success(res, { message: 'Purchase order', data: po });
});

export const submitPO = asyncHandler(async (req, res) => {
  const po = await purchaseService.submitPurchaseOrder(req.tenant, req.params.id, req.user.userId);
  return success(res, { message: 'Purchase order submitted', data: po });
});

export const approvePO = asyncHandler(async (req, res) => {
  const po = await purchaseService.approvePurchaseOrder(req.tenant, req.params.id, req.user.userId);
  return success(res, { message: 'Purchase order approved', data: po });
});

export const receiveGoods = asyncHandler(async (req, res) => {
  const result = await purchaseService.receiveGoods(
    req.tenant,
    req.params.id,
    req.user.userId,
    req.body
  );
  return created(res, result, 'Goods received');
});

export const listReceipts = asyncHandler(async (req, res) => {
  const receipts = await purchaseService.listReceiptsForPO(req.tenant, req.params.id);
  return success(res, { message: 'Goods receipts', data: receipts });
});



