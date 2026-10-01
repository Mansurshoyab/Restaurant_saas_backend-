import mongoose from 'mongoose';
import { Order } from './order.model.js';
import { MenuProduct } from '../products/product.model.js';
import { Modifier } from '../modifiers/modifier.model.js';
import { Recipe } from '../recipes/recipe.model.js';
import { ApiError } from '../../common/utils/apiError.js';
import { ORDER_STATUS, PAYMENT_STATUS } from '../../config/constants.js';
import { markTableOccupied, markTableAvailable, getTableById } from '../tables/table.service.js';
import { publish } from '../../common/events/eventBus.js';
import { EVENTS } from '../../common/events/eventTypes.js';
import { getSettings } from '../settings/settings.service.js';
import { logAudit } from '../audit/auditLog.service.js';

async function generateOrderNumber(tenant) {
  const count = await Order.countDocuments({}).setOptions({ tenant });
  return `ORD-${Date.now().toString().slice(-8)}-${count + 1}`;
}

/**
 * Resolves cart input (productId + quantity + modifierIds) into fully
 * priced, snapshotted OrderItem lines. Pins recipeVersion at build time
 * so historical food-cost stays accurate even if the recipe changes
 * later — see §13/§26.
 */
async function buildOrderItems(tenant, inputItems) {
  const productIds = inputItems.map((i) => i.productId);
  const products = await MenuProduct.find({ _id: { $in: productIds }, isActive: true }).setOptions({
    tenant,
  });
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  const allModifierIds = inputItems.flatMap((i) => i.modifierIds);
  const modifiers = allModifierIds.length
    ? await Modifier.find({ _id: { $in: allModifierIds } }).setOptions({ tenant })
    : [];
  const modifierMap = new Map(modifiers.map((m) => [m._id.toString(), m]));

  const recipes = await Recipe.find({ productId: { $in: productIds }, active: true }).setOptions({
    tenant,
  });
  const recipeMap = new Map(recipes.map((r) => [r.productId.toString(), r]));

  return inputItems.map((input) => {
    const product = productMap.get(input.productId);
    if (!product) throw ApiError.badRequest(`Product ${input.productId} not found or inactive`);

    const resolvedModifiers = input.modifierIds.map((id) => {
      const mod = modifierMap.get(id);
      if (!mod) throw ApiError.badRequest(`Modifier ${id} not found`);
      return { modifierId: mod._id, name: mod.name, price: mod.price };
    });

    const modifierTotal = resolvedModifiers.reduce((sum, m) => sum + m.price, 0);
    const lineUnitPrice = product.price + modifierTotal;
    const subtotal = Math.round(lineUnitPrice * input.quantity * 100) / 100;

    const recipe = recipeMap.get(input.productId);

    return {
      productId: product._id,
      productName: product.name,
      unitPrice: lineUnitPrice,
      quantity: input.quantity,
      modifiers: resolvedModifiers,
      recipeVersion: recipe?.version ?? null,
      subtotal,
    };
  });
}

/**
 * Pulls real tax config from RestaurantSettings (§7) instead of a
 * hardcoded rate. taxInclusive means product prices already include
 * tax, so it's not added again on top of the subtotal.
 */
async function computeTotals(tenant, items, discount = 0) {
  const settings = await getSettings(tenant.organizationId);

  const subtotal = Math.round(items.reduce((sum, i) => sum + i.subtotal, 0) * 100) / 100;
  const taxableAmount = Math.max(subtotal - discount, 0);

  const tax = settings.taxInclusive
    ? 0
    : Math.round(taxableAmount * (settings.taxRatePercent / 100) * 100) / 100;

  const total = Math.round((taxableAmount + tax) * 100) / 100;

  return { subtotal, discount, tax, total };
}

/**
 * Creates a DRAFT order — cart building. No inventory is touched here.
 * See §28: DRAFT carts never consume stock.
 */
export async function createOrder(tenant, userId, input) {
  const items = await buildOrderItems(tenant, input.items);
  const totals = await computeTotals(tenant, items, input.discount || 0);

  if (input.orderType === 'DINE_IN' && input.tableId) {
    const table = await getTableById(tenant, input.tableId);
    if (table.status === 'OCCUPIED' && table.currentOrderId) {
      throw ApiError.conflict('Table is already occupied by another active order');
    }
  }

  const orderNumber = await generateOrderNumber(tenant);

  const order = await Order.create({
    organizationId: tenant.organizationId,
    branchId: tenant.branchId,
    orderNumber,
    orderType: input.orderType,
    tableId: input.tableId || null,
    items,
    ...totals,
    status: ORDER_STATUS.DRAFT,
    paymentStatus: PAYMENT_STATUS.UNPAID,
    createdBy: userId,
  });

  return order;
}

export async function getOrderById(tenant, orderId) {
  const order = await Order.findById(orderId).setOptions({ tenant });
  if (!order) throw ApiError.notFound('Order not found');
  return order;
}

export async function listOrders(tenant, { status, orderType, from, to } = {}) {
  const query = {};
  if (status) query.status = status;
  if (orderType) query.orderType = orderType;
  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(from);
    if (to) query.createdAt.$lte = new Date(to);
  }
  return Order.find(query).sort({ createdAt: -1 }).setOptions({ tenant });
}

function assertMutable(order) {
  if ([ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED].includes(order.status)) {
    throw ApiError.badRequest(`Cannot modify an order that is ${order.status}`);
  }
}

export async function addItemsToOrder(tenant, orderId, newItemsInput) {
  const order = await Order.findById(orderId).setOptions({ tenant });
  if (!order) throw ApiError.notFound('Order not found');
  assertMutable(order);

  const newItems = await buildOrderItems(tenant, newItemsInput.items);
  order.items.push(...newItems);

  const totals = await computeTotals(tenant, order.items, order.discount);
  Object.assign(order, totals);

  await order.save();
  return order;
}

export async function updateItemQuantity(tenant, orderId, orderItemId, quantity) {
  const order = await Order.findById(orderId).setOptions({ tenant });
  if (!order) throw ApiError.notFound('Order not found');
  assertMutable(order);

  const item = order.items.id(orderItemId);
  if (!item) throw ApiError.notFound('Order item not found');

  if (quantity === 0) {
    item.deleteOne();
  } else {
    const unitPrice = item.unitPrice;
    item.quantity = quantity;
    item.subtotal = Math.round(unitPrice * quantity * 100) / 100;
  }

  const totals = await computeTotals(tenant, order.items, order.discount);
  Object.assign(order, totals);

  await order.save();
  return order;
}

export async function applyDiscount(tenant, orderId, discount) {
  const order = await Order.findById(orderId).setOptions({ tenant });
  if (!order) throw ApiError.notFound('Order not found');
  assertMutable(order);

  if (discount > order.subtotal) {
    throw ApiError.badRequest('Discount cannot exceed order subtotal');
  }

  const totals = await computeTotals(tenant, order.items, discount);
  Object.assign(order, totals);

  await order.save();
  return order;
}

/**
 * DRAFT -> CONFIRMED. Sends the order to the kitchen queue. No inventory
 * consumption here — that happens at payment time (§28). Table is marked
 * OCCUPIED here for dine-in.
 */
export async function confirmOrder(tenant, orderId) {
  const session = await mongoose.startSession();
  try {
    let order;
    await session.withTransaction(async () => {
      order = await Order.findOne({
        _id: orderId,
        organizationId: tenant.organizationId,
        branchId: tenant.branchId,
      }).session(session).setOptions({ tenant });

      if (!order) throw ApiError.notFound('Order not found');
      if (order.status !== ORDER_STATUS.DRAFT) {
        throw ApiError.badRequest(`Only DRAFT orders can be confirmed (currently ${order.status})`);
      }
      if (!order.items.length) {
        throw ApiError.badRequest('Cannot confirm an order with no items');
      }

      order.status = ORDER_STATUS.CONFIRMED;
      await order.save({ session });

      if (order.tableId) {
        await markTableOccupied(tenant, order.tableId, order._id, session);
      }
    });

    await publish(EVENTS.ORDER_CONFIRMED, {
      organizationId: tenant.organizationId.toString(),
      branchId: tenant.branchId.toString(),
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
    });

    return order;
  } finally {
    await session.endSession();
  }
}

export async function updateOrderStatus(tenant, orderId, nextStatus) {
  const allowed = {
    [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.PREPARING],
    [ORDER_STATUS.PREPARING]: [ORDER_STATUS.READY],
    [ORDER_STATUS.READY]: [ORDER_STATUS.SERVED, ORDER_STATUS.PICKED_UP],
  };

  const order = await Order.findById(orderId).setOptions({ tenant });
  if (!order) throw ApiError.notFound('Order not found');

  if (!allowed[order.status]?.includes(nextStatus)) {
    throw ApiError.badRequest(`Cannot transition order from ${order.status} to ${nextStatus}`);
  }

  order.status = nextStatus;
  await order.save();

  await publish(EVENTS.ORDER_STATUS_CHANGED, {
    organizationId: tenant.organizationId.toString(),
    branchId: tenant.branchId.toString(),
    orderId: order._id.toString(),
    status: nextStatus,
  });

  return order;
}

export async function cancelOrder(tenant, orderId, userId, reason) {
  const session = await mongoose.startSession();
  try {
    let order;
    await session.withTransaction(async () => {
      order = await Order.findOne({
        _id: orderId,
        organizationId: tenant.organizationId,
        branchId: tenant.branchId,
      }).session(session).setOptions({ tenant });

      if (!order) throw ApiError.notFound('Order not found');
      if ([ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED].includes(order.status)) {
        throw ApiError.badRequest(`Order is already ${order.status}`);
      }
      if (order.paymentStatus !== PAYMENT_STATUS.UNPAID) {
        throw ApiError.badRequest('Paid orders must be refunded, not cancelled directly');
      }

      order.status = ORDER_STATUS.CANCELLED;
      order.cancelReason = reason;
      order.cancelledBy = userId;
      await order.save({ session });

      if (order.tableId) {
        await markTableAvailable(tenant, order.tableId, session);
      }
    });

    await logAudit({
      organizationId: tenant.organizationId,
      branchId: tenant.branchId,
      userId,
      action: 'order.cancelled',
      entityType: 'Order',
      entityId: order._id,
      reason,
    });

    return order;
  } finally {
    await session.endSession();
  }
}

// Exposed for payment.service.js — marks order COMPLETED as part of the
// §28 transaction. Not called directly from a route.
export async function markOrderCompleted(tenant, orderId, session) {
  const order = await Order.findOneAndUpdate(
    { _id: orderId, organizationId: tenant.organizationId, branchId: tenant.branchId },
    {
      status: ORDER_STATUS.COMPLETED,
      paymentStatus: PAYMENT_STATUS.PAID,
      completedAt: new Date(),
    },
    { new: true, session }
  ).setOptions({ tenant });
  if (!order) throw ApiError.notFound('Order not found');

  if (order.tableId) {
    await markTableAvailable(tenant, order.tableId, session);
  }

  return order;
}


