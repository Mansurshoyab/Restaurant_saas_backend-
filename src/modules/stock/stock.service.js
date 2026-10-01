import mongoose from 'mongoose';
import { StockBalance } from './stockBalance.model.js';
import { StockTransaction } from './stockTransaction.model.js';
import { InventoryItem } from '../inventory/inventoryItem.model.js';
import { ApiError } from '../../common/utils/apiError.js';
import { STOCK_TX_TYPE } from '../../config/constants.js';
import { publish } from '../../common/events/eventBus.js';
import { EVENTS } from '../../common/events/eventTypes.js';

const DECREASING_TYPES = new Set([
  STOCK_TX_TYPE.SALE_CONSUMPTION,
  STOCK_TX_TYPE.WASTE,
  STOCK_TX_TYPE.TRANSFER_OUT,
]);

/**
 * The ONLY function in the codebase allowed to mutate StockBalance.quantity.
 * Atomic by construction: the decrement and the guard against negative
 * stock happen in the SAME findOneAndUpdate filter, not as a separate
 * read-then-check-then-write (see §28 — this is the race-condition fix).
 *
 * @param {Object} params
 * @param {Object} params.tenant - { organizationId, branchId }
 * @param {string} params.inventoryItemId
 * @param {string} params.type - STOCK_TX_TYPE value
 * @param {number} params.quantity - signed delta (negative = consume/remove)
 * @param {string} [params.reference]
 * @param {string} [params.reason]
 * @param {string} params.createdBy - userId
 * @param {mongoose.ClientSession} [params.session] - pass through when
 *        called as part of a larger transaction (e.g. payment.service.js)
 * @param {boolean} [params.allowNegative=false] - STOCK_ADJUSTMENT may
 *        legitimately push balance negative to correct bad prior data;
 *        all other decreasing types must never go negative.
 */
export async function applyStockChange({
  tenant,
  inventoryItemId,
  type,
  quantity,
  reference = null,
  reason = null,
  createdBy,
  session = null,
  allowNegative = false,
}) {
  if (quantity === 0) {
    throw ApiError.badRequest('Stock change quantity cannot be zero');
  }

  const isDecrease = DECREASING_TYPES.has(type) || quantity < 0;
  const filter = {
    organizationId: tenant.organizationId,
    branchId: tenant.branchId,
    inventoryItemId,
  };

  if (isDecrease && !allowNegative) {
    filter.quantity = { $gte: Math.abs(quantity) };
  }

  const updated = await StockBalance.findOneAndUpdate(
    filter,
    { $inc: { quantity } },
    { new: true, upsert: !isDecrease, session }
  ).setOptions({ tenant });

  if (!updated) {
    throw ApiError.conflict(
      'Insufficient stock for this operation, or stock balance record not found'
    );
  }

  const [transaction] = await StockTransaction.create(
    [
      {
        organizationId: tenant.organizationId,
        branchId: tenant.branchId,
        inventoryItemId,
        type,
        quantity,
        reference,
        reason,
        createdBy,
      },
    ],
    { session }
  );

  // Fire-and-forget, outside the transaction — low-stock checks and
  // dashboard refreshes should never block or fail the stock write itself.
  checkLowStock(tenant, inventoryItemId, updated).catch(() => {});

  return { balance: updated, transaction };
}

async function checkLowStock(tenant, inventoryItemId, balance) {
  if (balance.reorderLevel && balance.quantity <= balance.reorderLevel) {
    const item = await InventoryItem.findById(inventoryItemId).lean();
    await publish(EVENTS.STOCK_LOW, {
      organizationId: tenant.organizationId.toString(),
      branchId: tenant.branchId.toString(),
      inventoryItemId: inventoryItemId.toString(),
      itemName: item?.name,
      currentQuantity: balance.quantity,
      reorderLevel: balance.reorderLevel,
    });
  }
}

/**
 * Weighted average cost recalculation — called after a PURCHASE.
 * (100kg @ ৳400) + (50kg @ ৳450) => ৳416.67/kg. See §21 of the design doc.
 */
export async function recalculateAverageCost({ tenant, inventoryItemId, session = null }) {
  const [balance, item] = await Promise.all([
    StockBalance.findOne({
      organizationId: tenant.organizationId,
      branchId: tenant.branchId,
      inventoryItemId,
    }).session(session).setOptions({ tenant }),
    InventoryItem.findById(inventoryItemId).session(session).setOptions({ tenant }),
  ]);

  return { balance, item }; // exposed for purchase.service.js to call recordPurchase with correct math
}

/**
 * Records a purchase receipt: increases stock and recalculates weighted
 * average cost in one atomic step. Called by purchase.service.js when
 * goods are received (§15).
 */
export async function recordPurchase({
  tenant,
  inventoryItemId,
  quantity,
  unitCost,
  reference,
  createdBy,
  session = null,
}) {
  if (quantity <= 0) throw ApiError.badRequest('Purchase quantity must be positive');

  const existing = await StockBalance.findOne({
    organizationId: tenant.organizationId,
    branchId: tenant.branchId,
    inventoryItemId,
  }).session(session).setOptions({ tenant });

  const existingQty = existing?.quantity || 0;
  const item = await InventoryItem.findById(inventoryItemId).session(session).setOptions({ tenant });
  const existingAvgCost = item?.averageCost || 0;

  const newAverageCost =
    existingQty + quantity > 0
      ? (existingQty * existingAvgCost + quantity * unitCost) / (existingQty + quantity)
      : unitCost;

  const result = await applyStockChange({
    tenant,
    inventoryItemId,
    type: STOCK_TX_TYPE.PURCHASE,
    quantity,
    reference,
    createdBy,
    session,
  });

  await InventoryItem.findByIdAndUpdate(
    inventoryItemId,
    { averageCost: Math.round(newAverageCost * 100) / 100 },
    { session }
  ).setOptions({ tenant });

  return result;
}

/**
 * Records ingredient consumption for a completed sale. Called from
 * payment.service.js as part of the §28 transaction — always pass the
 * session so this is atomic with the Payment/Order writes.
 */
export async function recordSaleConsumption({
  tenant,
  inventoryItemId,
  quantity,
  orderReference,
  createdBy,
  session,
}) {
  if (quantity <= 0) throw ApiError.badRequest('Consumption quantity must be positive');

  return applyStockChange({
    tenant,
    inventoryItemId,
    type: STOCK_TX_TYPE.SALE_CONSUMPTION,
    quantity: -quantity,
    reference: orderReference,
    createdBy,
    session,
  });
}

export async function recordWaste({ tenant, inventoryItemId, quantity, reason, createdBy }) {
  if (quantity <= 0) throw ApiError.badRequest('Waste quantity must be positive');
  if (!reason) throw ApiError.badRequest('Reason is required for waste records');

  return applyStockChange({
    tenant,
    inventoryItemId,
    type: STOCK_TX_TYPE.WASTE,
    quantity: -quantity,
    reason,
    createdBy,
  });
}

/**
 * Physical count correction. `countedQuantity` is what the manager
 * physically counted; the signed delta vs. system quantity is computed
 * here and CAN go negative on the balance in edge cases, so allowNegative
 * is set — this is the one place that's intentional (§18, §29 checklist
 * still applies to every other stock-mutating path).
 */
export async function recordAdjustment({
  tenant,
  inventoryItemId,
  countedQuantity,
  reason,
  createdBy,
}) {
  if (!reason) throw ApiError.badRequest('Reason is required for stock adjustments');

  const current = await StockBalance.findOne({
    organizationId: tenant.organizationId,
    branchId: tenant.branchId,
    inventoryItemId,
  }).setOptions({ tenant });
  if (!current) throw ApiError.notFound('Stock balance not found for this item/branch');

  const delta = countedQuantity - current.quantity;
  if (delta === 0) throw ApiError.badRequest('Counted quantity matches system quantity, nothing to adjust');

  return applyStockChange({
    tenant,
    inventoryItemId,
    type: STOCK_TX_TYPE.STOCK_ADJUSTMENT,
    quantity: delta,
    reason,
    createdBy,
    allowNegative: true,
  });
}

/**
 * Inter-branch transfer — two balance mutations (source branch decreases,
 * destination increases) wrapped in one Mongo transaction so a partial
 * transfer can never leave stock in a phantom state. See §19.
 */
export async function recordTransfer({
  organizationId,
  fromBranchId,
  toBranchId,
  inventoryItemId,
  quantity,
  createdBy,
}) {
  if (quantity <= 0) throw ApiError.badRequest('Transfer quantity must be positive');
  if (fromBranchId.toString() === toBranchId.toString()) {
    throw ApiError.badRequest('Source and destination branch must differ');
  }

  const session = await mongoose.startSession();
  try {
    let outTx;
    let inTx;

    await session.withTransaction(async () => {
      const outResult = await applyStockChange({
        tenant: { organizationId, branchId: fromBranchId },
        inventoryItemId,
        type: STOCK_TX_TYPE.TRANSFER_OUT,
        quantity: -quantity,
        reference: `Transfer to branch ${toBranchId}`,
        createdBy,
        session,
      });
      outTx = outResult.transaction;

      const inResult = await applyStockChange({
        tenant: { organizationId, branchId: toBranchId },
        inventoryItemId,
        type: STOCK_TX_TYPE.TRANSFER_IN,
        quantity,
        reference: `Transfer from branch ${fromBranchId}`,
        createdBy,
        session,
      });
      inTx = inResult.transaction;

      outTx.relatedTransferId = inTx._id;
      inTx.relatedTransferId = outTx._id;
      await outTx.save({ session });
      await inTx.save({ session });
    });

    return { outTx, inTx };
  } finally {
    await session.endSession();
  }
}

export async function getStockBalance(tenant, inventoryItemId) {
  const balance = await StockBalance.findOne({ inventoryItemId }).setOptions({ tenant });
  if (!balance) throw ApiError.notFound('Stock balance not found');
  return balance;
}

export async function listStockBalances(tenant, { lowStockOnly = false } = {}) {
  const balances = await StockBalance.find({})
    .populate('inventoryItemId', 'name unit averageCost')
    .setOptions({ tenant })
    .lean();

  if (!lowStockOnly) return balances;

  return balances.filter((b) => b.reorderLevel && b.quantity <= b.reorderLevel);
}

export async function setReorderLevels(tenant, inventoryItemId, { minimumStock, reorderLevel, maximumStock }) {
  const balance = await StockBalance.findOneAndUpdate(
    { inventoryItemId },
    { minimumStock, reorderLevel, maximumStock },
    { new: true }
  ).setOptions({ tenant });

  if (!balance) throw ApiError.notFound('Stock balance not found');
  return balance;
}

export async function listStockTransactions(tenant, { inventoryItemId, type, from, to } = {}) {
  const query = {};
  if (inventoryItemId) query.inventoryItemId = inventoryItemId;
  if (type) query.type = type;
  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(from);
    if (to) query.createdAt.$lte = new Date(to);
  }

  return StockTransaction.find(query)
    .populate('inventoryItemId', 'name unit')
    .sort({ createdAt: -1 })
    .setOptions({ tenant });
}

