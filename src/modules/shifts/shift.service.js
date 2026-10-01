import { POSShift } from './posShift.model.js';
import { Payment } from '../payments/payment.model.js';
import { Refund } from '../refunds/refund.model.js';
import { Expense } from '../expenses/expense.model.js';
import { ApiError } from '../../common/utils/apiError.js';
import { PAYMENT_METHOD, POS_SHIFT_STATUS } from '../../config/constants.js';

export async function getOpenShiftForUser(tenant, userId) {
  return POSShift.findOne({ userId, status: POS_SHIFT_STATUS.OPEN }).setOptions({ tenant });
}

export async function openShift(tenant, userId, openingCash) {
  const existing = await getOpenShiftForUser(tenant, userId);
  if (existing) throw ApiError.conflict('You already have an open shift');

  return POSShift.create({
    organizationId: tenant.organizationId,
    branchId: tenant.branchId,
    userId,
    openingCash,
  });
}





/**
 * Expected cash formula, §43:
 * Opening + Cash Sales - Cash Refunds - Cash Expenses = Expected Cash
 */
async function computeExpectedCash(tenant, shift) {
  const { organizationId, branchId } = tenant;
  const { userId, openedAt } = shift;
  const windowFilter = { organizationId, branchId, createdAt: { $gte: openedAt } };

  const [cashPayments, cashRefunds, cashExpenses] = await Promise.all([
    Payment.aggregate([
      { $match: { ...windowFilter, receivedBy: userId, method: PAYMENT_METHOD.CASH, status: 'RECORDED' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Refund.aggregate([
      { $match: { ...windowFilter, approvedBy: userId, method: PAYMENT_METHOD.CASH } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Expense.aggregate([
      { $match: { ...windowFilter, paidBy: userId, method: PAYMENT_METHOD.CASH } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  const cashSalesTotal = cashPayments[0]?.total || 0;
  const cashRefundsTotal = cashRefunds[0]?.total || 0;
  const cashExpensesTotal = cashExpenses[0]?.total || 0;

  return (
    shift.openingCash + cashSalesTotal - cashRefundsTotal - cashExpensesTotal
  );
}

/**
 * Live mid-shift summary so the cashier can reconcile before closing,
 * rather than discovering a variance only at the end of the day.
 */
export async function getShiftSummary(tenant, userId) {
  const shift = await getOpenShiftForUser(tenant, userId);
  if (!shift) throw ApiError.badRequest('No open shift found');

  const { organizationId, branchId } = tenant;
  const windowFilter = { organizationId, branchId, createdAt: { $gte: shift.openedAt } };

  const [byMethod, cashRefunds, cashExpenses, orderCount] = await Promise.all([
    Payment.aggregate([
      { $match: { ...windowFilter, receivedBy: userId, status: 'RECORDED' } },
      { $group: { _id: '$method', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    Refund.aggregate([
      { $match: { ...windowFilter, approvedBy: userId, method: PAYMENT_METHOD.CASH } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Expense.aggregate([
      { $match: { ...windowFilter, paidBy: userId, method: PAYMENT_METHOD.CASH } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Payment.distinct('orderId', { ...windowFilter, receivedBy: userId, status: 'RECORDED' }),
  ]);

  const cashSales = byMethod.find((m) => m._id === PAYMENT_METHOD.CASH)?.total || 0;
  const cashRefundsTotal = cashRefunds[0]?.total || 0;
  const cashExpensesTotal = cashExpenses[0]?.total || 0;

  const expectedCash =
    shift.openingCash + cashSales - cashRefundsTotal - cashExpensesTotal;

  return {
    shift: {
      _id: shift._id,
      openedAt: shift.openedAt,
      openingCash: shift.openingCash,
      status: shift.status,
    },
    salesByMethod: byMethod.map((m) => ({ method: m._id, total: m.total, count: m.count })),
    cash: {
      openingCash: shift.openingCash,
      cashSales,
      cashRefunds: cashRefundsTotal,
      cashExpenses: cashExpensesTotal,
      expectedCash: Math.round(expectedCash * 100) / 100,
    },
    ordersHandled: orderCount.length,
  };
}




export async function closeShift(tenant, userId, { closingCash, notes }) {
  const shift = await getOpenShiftForUser(tenant, userId);
  if (!shift) throw ApiError.badRequest('No open shift found to close');

  const expectedCash = await computeExpectedCash(tenant, shift);
  const variance = Math.round((closingCash - expectedCash) * 100) / 100;

  shift.closedAt = new Date();
  shift.closingCash = closingCash;
  shift.expectedCash = Math.round(expectedCash * 100) / 100;
  shift.variance = variance;
  shift.status = POS_SHIFT_STATUS.CLOSED;
  shift.notes = notes || null;

  await shift.save();
  return shift;
}

export async function listShifts(tenant, { userId, status } = {}) {
  const query = {};
  if (userId) query.userId = userId;
  if (status) query.status = status;
  return POSShift.find(query).populate('userId', 'name').sort({ openedAt: -1 }).setOptions({ tenant });
}

export async function getShiftById(tenant, shiftId) {
  const shift = await POSShift.findById(shiftId).populate('userId', 'name').setOptions({ tenant });
  if (!shift) throw ApiError.notFound('Shift not found');
  return shift;
}



