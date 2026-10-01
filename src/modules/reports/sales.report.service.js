import { Order } from '../orders/order.model.js';
import { ORDER_STATUS } from '../../config/constants.js';

export async function getSalesReport(tenant, { from, to } = {}) {
  const match = {
    organizationId: tenant.organizationId,
    branchId: tenant.branchId,
    status: ORDER_STATUS.COMPLETED,
  };
  if (from || to) {
    match.completedAt = {};
    if (from) match.completedAt.$gte = new Date(from);
    if (to) match.completedAt.$lte = new Date(to);
  }

  const [summary] = await Order.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        grossSales: { $sum: '$subtotal' },
        totalDiscount: { $sum: '$discount' },
        totalTax: { $sum: '$tax' },
        netSales: { $sum: '$total' },
        orderCount: { $sum: 1 },
      },
    },
  ]);

  const result = summary || {
    grossSales: 0,
    totalDiscount: 0,
    totalTax: 0,
    netSales: 0,
    orderCount: 0,
  };

  result.averageOrderValue = result.orderCount
    ? Math.round((result.netSales / result.orderCount) * 100) / 100
    : 0;

  delete result._id;
  return result;
}

export async function getSalesTimeseries(tenant, { from, to, granularity = 'day' } = {}) {
  const match = {
    organizationId: tenant.organizationId,
    branchId: tenant.branchId,
    status: ORDER_STATUS.COMPLETED,
  };
  if (from || to) {
    match.completedAt = {};
    if (from) match.completedAt.$gte = new Date(from);
    if (to) match.completedAt.$lte = new Date(to);
  }

  const dateFormat = granularity === 'month' ? '%Y-%m' : '%Y-%m-%d';

  return Order.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format: dateFormat, date: '$completedAt' } },
        netSales: { $sum: '$total' },
        orderCount: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { date: '$_id', netSales: 1, orderCount: 1, _id: 0 } },
  ]);
}


