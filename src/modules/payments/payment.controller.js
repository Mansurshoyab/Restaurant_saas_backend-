import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { success, created } from '../../common/utils/apiResponse.js';
import * as paymentService from './payment.service.js';

export const payOrder = asyncHandler(async (req, res) => {
  const result = await paymentService.payOrder(req.tenant, req.user.userId, req.body);
  return created(res, result, 'Payment recorded and order completed');
});

export const listPayments = asyncHandler(async (req, res) => {
  const payments = await paymentService.listPaymentsForOrder(req.tenant, req.params.orderId);
  return success(res, { message: 'Payments', data: payments });
});

export const refundOrder = asyncHandler(async (req, res) => {
  const refund = await paymentService.refundOrder(req.tenant, req.user.userId, req.body);
  return created(res, refund, 'Refund recorded');
});


