import mongoose from 'mongoose';
import { Payment } from './payment.model.js';
import { Order } from '../orders/order.model.js';
import { Refund } from '../refunds/refund.model.js';
import { Recipe } from '../recipes/recipe.model.js';
import { ApiError } from '../../common/utils/apiError.js';
import { ORDER_STATUS, PAYMENT_METHOD } from '../../config/constants.js';
import { markOrderCompleted } from '../orders/order.service.js';
import { recordSaleConsumption } from '../stock/stock.service.js';
import { publish } from '../../common/events/eventBus.js';
import { EVENTS } from '../../common/events/eventTypes.js';

/**
 * The core POS transaction described in §28 of the design doc.
 *
 * Sequence:
 *  1. Validate order is CONFIRMED (idempotency middleware already guards
 *     against duplicate "Pay" taps at the HTTP layer — see idempotency.middleware.js)
 *  2. Start Mongo session/transaction
 *     2a. Insert Payment record(s) — supports split payments
 *     2b. Mark Order COMPLETED / paymentStatus PAID, free the table
 *     2c. For each OrderItem, walk its pinned recipe version's ingredients
 *         and atomically decrement StockBalance via stock.service —
 *         which itself guards against negative stock in its own filter
 *     2d. Commit
 *  3. On any failure, abort — Order stays CONFIRMED, cashier retries
 *  4. Emit events outside the transaction (kitchen/dashboard refresh, low stock)
 */
export async function payOrder(tenant, userId, { orderId, payments }) {
  const session = await mongoose.startSession();

  try {
    let order;
    let createdPayments;

    await session.withTransaction(async () => {
      // --- 1. Validate order state ---
      order = await Order.findOne({
        _id: orderId,
        organizationId: tenant.organizationId,
        branchId: tenant.branchId,
      }).session(session).setOptions({ tenant });

      if (!order) throw ApiError.notFound('Order not found');
      if (order.status !== ORDER_STATUS.CONFIRMED && order.status !== ORDER_STATUS.SERVED && order.status !== ORDER_STATUS.PICKED_UP && order.status !== ORDER_STATUS.READY) {
        throw ApiError.badRequest(
          `Order must be CONFIRMED/READY/SERVED before payment (currently ${order.status})`
        );
      }

      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      if (Math.round(totalPaid * 100) !== Math.round(order.total * 100)) {
        throw ApiError.badRequest(
          `Payment total (${totalPaid}) does not match order total (${order.total})`
        );
      }

      // --- 2a. Insert Payment record(s) — split payments supported ---
      const paymentDocs = payments.map((p) => {
        const isCash = p.method === PAYMENT_METHOD.CASH;
        const changeGiven = isCash && p.amountReceived ? p.amountReceived - p.amount : 0;

        if (changeGiven < 0) {
          throw ApiError.badRequest('Amount received is less than the cash payment amount');
        }

        return {
          organizationId: tenant.organizationId,
          branchId: tenant.branchId,
          orderId: order._id,
          method: p.method,
          amount: p.amount,
          changeGiven,
          transactionId: p.transactionId || null,
          reference: p.reference || null,
          receivedBy: userId,
        };
      });

      createdPayments = await Payment.insertMany(paymentDocs, { session });

      // --- 2b. Mark order COMPLETED, free the table ---
      order = await markOrderCompleted(tenant, order._id, session);

      // --- 2c. Recipe-driven ingredient consumption, atomically ---
      // Recipe lookups use the version pinned on each OrderItem at cart-build
      // time (§13, §26) so a recipe edited after this order was drafted
      // doesn't change what gets consumed now.
      for (const item of order.items) {
        if (item.recipeVersion == null) continue; // product had no recipe at order time

        const recipe = await Recipe.findOne({
          organizationId: tenant.organizationId,
          productId: item.productId,
          version: item.recipeVersion,
        }).session(session).setOptions({ tenant });

        if (!recipe) continue; // recipe since deleted — nothing to consume against

        for (const line of recipe.items) {
          const consumeQty = line.quantity * item.quantity;

          await recordSaleConsumption({
            tenant,
            inventoryItemId: line.inventoryItemId,
            quantity: consumeQty,
            orderReference: `Order ${order.orderNumber}`,
            createdBy: userId,
            session,
          });
        }
      }
    });

    // --- 4. Emit events outside the transaction ---
    await publish(EVENTS.PAYMENT_RECORDED, {
      organizationId: tenant.organizationId.toString(),
      branchId: tenant.branchId.toString(),
      orderId: order._id.toString(),
      total: order.total,
    });
    await publish(EVENTS.ORDER_COMPLETED, {
      organizationId: tenant.organizationId.toString(),
      branchId: tenant.branchId.toString(),
      orderId: order._id.toString(),
    });

    return { order, payments: createdPayments };
  } finally {
    await session.endSession();
  }
}

export async function listPaymentsForOrder(tenant, orderId) {
  return Payment.find({ orderId }).sort({ createdAt: 1 }).setOptions({ tenant });
}

/**
 * Refund does NOT automatically reverse stock consumption — per §45 of
 * the design doc, "inventory rules must reverse any consumption where
 * appropriate," which is a business decision (was the food actually
 * returned/unused?), not something safe to automate blindly. Manager
 * should follow up with a manual WASTE or STOCK_ADJUSTMENT entry if the
 * ingredients truly weren't consumed.
 */
export async function refundOrder(tenant, userId, { orderId, amount, method, reason }) {
  const order = await Order.findOne({
    _id: orderId,
    organizationId: tenant.organizationId,
    branchId: tenant.branchId,
  }).setOptions({ tenant });

  if (!order) throw ApiError.notFound('Order not found');
  if (order.paymentStatus !== 'PAID') {
    throw ApiError.badRequest('Only paid orders can be refunded');
  }
  if (amount > order.total) {
    throw ApiError.badRequest('Refund amount cannot exceed order total');
  }

  const refund = await Refund.create({
    organizationId: tenant.organizationId,
    branchId: tenant.branchId,
    orderId,
    amount,
    method,
    reason,
    approvedBy: userId,
  });

  order.paymentStatus = amount === order.total ? 'REFUNDED' : 'PARTIALLY_PAID';
  await order.save();

  await publish(EVENTS.ORDER_STATUS_CHANGED, {
    organizationId: tenant.organizationId.toString(),
    orderId: order._id.toString(),
    paymentStatus: order.paymentStatus,
  });

  return refund;
}


