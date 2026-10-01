import { StockBalance } from '../stock/stockBalance.model.js';
import { StockTransaction } from '../stock/stockTransaction.model.js';

export async function getStockValuation(tenant) {
  const balances = await StockBalance.find({
    organizationId: tenant.organizationId,
    branchId: tenant.branchId,
  })
    .populate({ path: 'inventoryItemId', select: 'name unit averageCost categoryId', populate: { path: 'categoryId', select: 'name' } })
    .setOptions({ tenant });

  const byCategory = {};
  let total = 0;

  for (const b of balances) {
    const item = b.inventoryItemId;
    if (!item) continue;
    const value = b.quantity * (item.averageCost || 0);
    const categoryName = item.categoryId?.name || 'Uncategorized';

    byCategory[categoryName] = (byCategory[categoryName] || 0) + value;
    total += value;
  }

  return {
    byCategory: Object.entries(byCategory).map(([category, value]) => ({
      category,
      value: Math.round(value * 100) / 100,
    })),
    total: Math.round(total * 100) / 100,
  };
}

export async function getStockMovementReport(tenant, { inventoryItemId, from, to } = {}) {
  const match = { organizationId: tenant.organizationId, branchId: tenant.branchId };
  if (inventoryItemId) match.inventoryItemId = inventoryItemId;
  if (from || to) {
    match.createdAt = {};
    if (from) match.createdAt.$gte = new Date(from);
    if (to) match.createdAt.$lte = new Date(to);
  }

  return StockTransaction.aggregate([
    { $match: match },
    {
      $group: {
        _id: { inventoryItemId: '$inventoryItemId', type: '$type' },
        totalQuantity: { $sum: '$quantity' },
        count: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: 'inventoryitems',
        localField: '_id.inventoryItemId',
        foreignField: '_id',
        as: 'item',
      },
    },
    { $unwind: '$item' },
    {
      $project: {
        inventoryItemId: '$_id.inventoryItemId',
        itemName: '$item.name',
        type: '$_id.type',
        totalQuantity: 1,
        count: 1,
        _id: 0,
      },
    },
  ]);
}



