import { Order } from '../orders/order.model.js';
import { ORDER_STATUS } from '../../config/constants.js';

export async function getTopProducts(tenant, { from, to, limit = 10, sortBy = 'quantity' } = {}) {
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

  const sortField = sortBy === 'revenue' ? 'revenue' : 'quantitySold';

  return Order.aggregate([
    { $match: match },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.productId',
        productName: { $first: '$items.productName' },
        quantitySold: { $sum: '$items.quantity' },
        revenue: { $sum: '$items.subtotal' },
      },
    },
    { $sort: { [sortField]: -1 } },
    { $limit: Number(limit) || 10 },
    { $project: { productId: '$_id', productName: 1, quantitySold: 1, revenue: 1, _id: 0 } },
  ]);
}


