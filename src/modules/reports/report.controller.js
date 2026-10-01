import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { success } from '../../common/utils/apiResponse.js';
import { getSalesReport, getSalesTimeseries } from './sales.report.service.js';
import { getPaymentReport } from './payment.report.service.js';
import { getTopProducts } from './product.report.service.js';
import { getStockValuation, getStockMovementReport } from './inventory.report.service.js';
import { getWasteReport } from './waste.report.service.js';
import { getProfitabilityReport } from './profitability.report.service.js';

export const salesReport = asyncHandler(async (req, res) => {
  const data = await getSalesReport(req.tenant, req.query);
  return success(res, { message: 'Sales report', data });
});

export const salesTimeseries = asyncHandler(async (req, res) => {
  const data = await getSalesTimeseries(req.tenant, req.query);
  return success(res, { message: 'Sales timeseries', data });
});

export const paymentReport = asyncHandler(async (req, res) => {
  const data = await getPaymentReport(req.tenant, req.query);
  return success(res, { message: 'Payment report', data });
});

export const productReport = asyncHandler(async (req, res) => {
  const data = await getTopProducts(req.tenant, req.query);
  return success(res, { message: 'Product report', data });
});

export const inventoryValuation = asyncHandler(async (req, res) => {
  const data = await getStockValuation(req.tenant);
  return success(res, { message: 'Inventory valuation', data });
});

export const inventoryMovement = asyncHandler(async (req, res) => {
  const data = await getStockMovementReport(req.tenant, req.query);
  return success(res, { message: 'Stock movement', data });
});

export const wasteReport = asyncHandler(async (req, res) => {
  const data = await getWasteReport(req.tenant, req.query);
  return success(res, { message: 'Waste report', data });
});

export const profitabilityReport = asyncHandler(async (req, res) => {
  const data = await getProfitabilityReport(req.tenant, req.query);
  return success(res, { message: 'Profitability report', data });
});


