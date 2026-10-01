import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { success, created } from '../../common/utils/apiResponse.js';
import * as orderService from './order.service.js';

export const createOrder = asyncHandler(async (req, res) => {
  const order = await orderService.createOrder(req.tenant, req.user.userId, req.body);
  return created(res, order, 'Order draft created');
});

export const listOrders = asyncHandler(async (req, res) => {
  const orders = await orderService.listOrders(req.tenant, req.query);
  return success(res, { message: 'Orders', data: orders });
});

export const getOrder = asyncHandler(async (req, res) => {
  const order = await orderService.getOrderById(req.tenant, req.params.id);
  return success(res, { message: 'Order', data: order });
});

export const addItems = asyncHandler(async (req, res) => {
  const order = await orderService.addItemsToOrder(req.tenant, req.params.id, req.body);
  return success(res, { message: 'Items added', data: order });
});

export const updateItemQuantity = asyncHandler(async (req, res) => {
  const order = await orderService.updateItemQuantity(
    req.tenant,
    req.params.id,
    req.params.itemId,
    req.body.quantity
  );
  return success(res, { message: 'Item updated', data: order });
});

export const applyDiscount = asyncHandler(async (req, res) => {
  const order = await orderService.applyDiscount(req.tenant, req.params.id, req.body.discount);
  return success(res, { message: 'Discount applied', data: order });
});

export const confirmOrder = asyncHandler(async (req, res) => {
  const order = await orderService.confirmOrder(req.tenant, req.params.id);
  return success(res, { message: 'Order confirmed', data: order });
});

export const updateStatus = asyncHandler(async (req, res) => {
  const order = await orderService.updateOrderStatus(req.tenant, req.params.id, req.body.status);
  return success(res, { message: 'Order status updated', data: order });
});

export const cancelOrder = asyncHandler(async (req, res) => {
  const order = await orderService.cancelOrder(
    req.tenant,
    req.params.id,
    req.user.userId,
    req.body.reason
  );
  return success(res, { message: 'Order cancelled', data: order });
});


