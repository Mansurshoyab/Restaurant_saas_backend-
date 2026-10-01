import mongoose from 'mongoose';
import { PurchaseOrder } from './purchaseOrder.model.js';
import { GoodsReceipt } from './goodsReceipt.model.js';
import { Supplier } from '../suppliers/supplier.model.js';
import { InventoryItem } from '../inventory/inventoryItem.model.js';
import { ApiError } from '../../common/utils/apiError.js';
import { PURCHASE_STATUS } from '../../config/constants.js';
import { recordPurchase } from '../stock/stock.service.js';
import { publish } from '../../common/events/eventBus.js';
import { EVENTS } from '../../common/events/eventTypes.js';

async function generatePoNumber(tenant) {
  const count = await PurchaseOrder.countDocuments({}).setOptions({ tenant, skipTenantScope: false });
  return `PO-${Date.now().toString().slice(-8)}-${count + 1}`;
}

async function assertSupplierExists(tenant, supplierId) {
  const supplier = await Supplier.findById(supplierId).setOptions({ tenant });
  if (!supplier) throw ApiError.badRequest('Supplier not found');
}

async function assertInventoryItemsExist(tenant, items) {
  const ids = items.map((i) => i.inventoryItemId);
  const found = await InventoryItem.find({ _id: { $in: ids } }).setOptions({ tenant });
  if (found.length !== new Set(ids.map(String)).size) {
    throw ApiError.badRequest('One or more inventory items do not exist');
  }
}

export async function createPurchaseOrder(tenant, userId, input) {
  await assertSupplierExists(tenant, input.supplierId);
  await assertInventoryItemsExist(tenant, input.items);

  const totalAmount = input.items.reduce(
    (sum, i) => sum + i.orderedQuantity * i.unitCost,
    0
  );

  const poNumber = await generatePoNumber(tenant);

  return PurchaseOrder.create({
    organizationId: tenant.organizationId,
    branchId: tenant.branchId,
    poNumber,
    supplierId: input.supplierId,
    items: input.items,
    totalAmount: Math.round(totalAmount * 100) / 100,
    status: PURCHASE_STATUS.DRAFT,
    createdBy: userId,
  });
}

export async function listPurchaseOrders(tenant, { status, supplierId } = {}) {
  const query = {};
  if (status) query.status = status;
  if (supplierId) query.supplierId = supplierId;

  return PurchaseOrder.find(query)
    .populate('supplierId', 'name')
    .sort({ createdAt: -1 })
    .setOptions({ tenant });
}

export async function getPurchaseOrderById(tenant, poId) {
  const po = await PurchaseOrder.findById(poId)
    .populate('supplierId', 'name')
    .populate('items.inventoryItemId', 'name unit')
    .setOptions({ tenant });
  if (!po) throw ApiError.notFound('Purchase order not found');
  return po;
}

function assertTransition(current, next) {
  const allowed = {
    [PURCHASE_STATUS.DRAFT]: [PURCHASE_STATUS.SUBMITTED],
    [PURCHASE_STATUS.SUBMITTED]: [PURCHASE_STATUS.APPROVED, PURCHASE_STATUS.DRAFT],
    [PURCHASE_STATUS.APPROVED]: [PURCHASE_STATUS.PARTIALLY_RECEIVED, PURCHASE_STATUS.RECEIVED],
    [PURCHASE_STATUS.PARTIALLY_RECEIVED]: [PURCHASE_STATUS.RECEIVED],
    [PURCHASE_STATUS.RECEIVED]: [],
  };
  if (!allowed[current]?.includes(next)) {
    throw ApiError.badRequest(`Cannot transition purchase order from ${current} to ${next}`);
  }
}

export async function submitPurchaseOrder(tenant, poId, userId) {
  const po = await PurchaseOrder.findById(poId).setOptions({ tenant });
  if (!po) throw ApiError.notFound('Purchase order not found');
  assertTransition(po.status, PURCHASE_STATUS.SUBMITTED);

  po.status = PURCHASE_STATUS.SUBMITTED;
  po.submittedBy = userId;
  await po.save();
  return po;
}

export async function approvePurchaseOrder(tenant, poId, userId) {
  const po = await PurchaseOrder.findById(poId).setOptions({ tenant });
  if (!po) throw ApiError.notFound('Purchase order not found');
  assertTransition(po.status, PURCHASE_STATUS.APPROVED);

  po.status = PURCHASE_STATUS.APPROVED;
  po.approvedBy = userId;
  po.approvedAt = new Date();
  await po.save();
  return po;
}

/**
 * Goods receiving — the moment stock actually increases (§15, §24).
 * Supports partial receiving: lines can total less than what's still
 * outstanding on the PO, and the PO stays PARTIALLY_RECEIVED until the
 * cumulative receivedQuantity reaches orderedQuantity on every line.
 *
 * Wrapped in one Mongo transaction: the GoodsReceipt record, the PO's
 * updated receivedQuantity/status, and every stock.service.recordPurchase
 * call all commit together or not at all.
 */
export async function receiveGoods(tenant, poId, userId, { lines }) {
  const session = await mongoose.startSession();
  try {
    let receipt;
    let updatedPo;

    await session.withTransaction(async () => {
      const po = await PurchaseOrder.findOne({
        _id: poId,
        organizationId: tenant.organizationId,
        branchId: tenant.branchId,
      }).session(session).setOptions({ tenant });

      if (!po) throw ApiError.notFound('Purchase order not found');
      if (![PURCHASE_STATUS.APPROVED, PURCHASE_STATUS.PARTIALLY_RECEIVED].includes(po.status)) {
        throw ApiError.badRequest(
          `Purchase order must be APPROVED or PARTIALLY_RECEIVED to receive goods (currently ${po.status})`
        );
      }

      for (const line of lines) {
        const poItem = po.items.find(
          (i) => i.inventoryItemId.toString() === line.inventoryItemId.toString()
        );
        if (!poItem) {
          throw ApiError.badRequest(
            `Item ${line.inventoryItemId} is not part of this purchase order`
          );
        }

        const remaining = poItem.orderedQuantity - poItem.receivedQuantity;
        if (line.quantity > remaining) {
          throw ApiError.badRequest(
            `Cannot receive ${line.quantity} — only ${remaining} outstanding for this item`
          );
        }

        const unitCost = line.unitCost ?? poItem.unitCost;

        await recordPurchase({
          tenant,
          inventoryItemId: line.inventoryItemId,
          quantity: line.quantity,
          unitCost,
          reference: `PO ${po.poNumber}`,
          createdBy: userId,
          session,
        });

        poItem.receivedQuantity += line.quantity;
      }

      const fullyReceived = po.items.every((i) => i.receivedQuantity >= i.orderedQuantity);
      po.status = fullyReceived ? PURCHASE_STATUS.RECEIVED : PURCHASE_STATUS.PARTIALLY_RECEIVED;
      await po.save({ session });

      [receipt] = await GoodsReceipt.create(
        [
          {
            organizationId: tenant.organizationId,
            branchId: tenant.branchId,
            purchaseOrderId: po._id,
            lines: lines.map((l) => ({
              inventoryItemId: l.inventoryItemId,
              quantity: l.quantity,
              unitCost: l.unitCost ?? po.items.find(
                (i) => i.inventoryItemId.toString() === l.inventoryItemId.toString()
              ).unitCost,
            })),
            receivedBy: userId,
          },
        ],
        { session }
      );

      updatedPo = po;
    });

    await publish(EVENTS.PURCHASE_RECEIVED, {
      organizationId: tenant.organizationId.toString(),
      branchId: tenant.branchId.toString(),
      purchaseOrderId: poId.toString(),
      status: updatedPo.status,
    });

    return { receipt, purchaseOrder: updatedPo };
  } finally {
    await session.endSession();
  }
}

export async function listReceiptsForPO(tenant, poId) {
  return GoodsReceipt.find({ purchaseOrderId: poId })
    .populate('lines.inventoryItemId', 'name unit')
    .sort({ createdAt: -1 })
    .setOptions({ tenant });
}


