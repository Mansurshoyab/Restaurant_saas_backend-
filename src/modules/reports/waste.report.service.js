import { StockTransaction } from '../stock/stockTransaction.model.js';
import { STOCK_TX_TYPE } from '../../config/constants.js';

export async function getWasteReport(tenant, { from, to } = {}) {
  const match = {
    organizationId: tenant.organizationId,
    branchId: tenant.branchId,
    type: STOCK_TX_TYPE.WASTE,
  };
  if (from || to) {
    match.createdAt = {};
    if (from) match.createdAt.$gte = new Date(from);
    if (to) match.createdAt.$lte = new Date(to);
  }

  return StockTransaction.aggregate([
    { $match: match },
    {
      $lookup: {
        from: 'inventoryitems',
        localField: 'inventoryItemId',
        foreignField: '_id',
        as: 'item',
      },
    },
    { $unwind: '$item' },
    {
      $group: {
        _id: '$inventoryItemId',
        itemName: { $first: '$item.name' },
        unit: { $first: '$item.unit' },
        totalWasted: { $sum: { $abs: '$quantity' } },
        estimatedValue: { $sum: { $multiply: [{ $abs: '$quantity' }, '$item.averageCost'] } },
        occurrences: { $sum: 1 },
      },
    },
    { $sort: { estimatedValue: -1 } },
    {
      $project: {
        inventoryItemId: '$_id',
        itemName: 1,
        unit: 1,
        totalWasted: 1,
        estimatedValue: { $round: ['$estimatedValue', 2] },
        occurrences: 1,
        _id: 0,
      },
    },
  ]);
}


