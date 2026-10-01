import { getSalesReport } from './sales.report.service.js';
import { Order } from '../orders/order.model.js';
import { Expense } from '../expenses/expense.model.js';
import { Recipe } from '../recipes/recipe.model.js';
import { ORDER_STATUS } from '../../config/constants.js';

/**
 * Estimated Profit = Sales - Food Cost - Discounts - Expenses (§41).
 * "Estimated" is not a caveat added for show — food cost here is
 * recomputed from each OrderItem's pinned recipeVersion, which is
 * exactly right, but expenses/discounts are simple sums with no
 * double-entry accounting behind them. Label accordingly in the UI.
 */
export async function getProfitabilityReport(tenant, { from, to } = {}) {
  const salesSummary = await getSalesReport(tenant, { from, to });

  const orderMatch = {
    organizationId: tenant.organizationId,
    branchId: tenant.branchId,
    status: ORDER_STATUS.COMPLETED,
  };
  if (from || to) {
    orderMatch.completedAt = {};
    if (from) orderMatch.completedAt.$gte = new Date(from);
    if (to) orderMatch.completedAt.$lte = new Date(to);
  }

  const orders = await Order.find(orderMatch).setOptions({ tenant }).lean();

  // Batch-load every distinct (productId, recipeVersion) pair actually used
  const versionKeys = new Set();
  for (const order of orders) {
    for (const item of order.items) {
      if (item.recipeVersion != null) {
        versionKeys.add(`${item.productId}:${item.recipeVersion}`);
      }
    }
  }

  let recipes = [];
  if (versionKeys.size > 0) {
    recipes = await Recipe.find({
      organizationId: tenant.organizationId,
      $or: Array.from(versionKeys).map((key) => {
        const [productId, version] = key.split(':');
        return { productId, version: Number(version) };
      }),
    })
      .setOptions({ tenant })
      .populate('items.inventoryItemId', 'averageCost')
      .lean();
  }

  const recipeMap = new Map(
    recipes.map((r) => [`${r.productId}:${r.version}`, r])
  );

  let totalFoodCost = 0;
  for (const order of orders) {
    for (const item of order.items) {
      const recipe = recipeMap.get(`${item.productId}:${item.recipeVersion}`);
      if (!recipe) continue;
      const lineCost = recipe.items.reduce(
        (sum, ri) => sum + (ri.inventoryItemId?.averageCost || 0) * ri.quantity,
        0
      );
      totalFoodCost += lineCost * item.quantity;
    }
  }

  const expenseMatch = {
    organizationId: tenant.organizationId,
    branchId: tenant.branchId,
  };
  if (from || to) {
    expenseMatch.expenseDate = {};
    if (from) expenseMatch.expenseDate.$gte = new Date(from);
    if (to) expenseMatch.expenseDate.$lte = new Date(to);
  }
  const expenseAgg = await Expense.aggregate([
    { $match: expenseMatch },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  const totalExpenses = expenseAgg[0]?.total || 0;

  const estimatedProfit =
    salesSummary.netSales - totalFoodCost - totalExpenses;

  return {
    revenue: salesSummary.netSales,
    foodCost: Math.round(totalFoodCost * 100) / 100,
    discounts: salesSummary.totalDiscount,
    expenses: Math.round(totalExpenses * 100) / 100,
    estimatedProfit: Math.round(estimatedProfit * 100) / 100,
    note: 'Estimated profit — not a substitute for full accounting',
  };
}


