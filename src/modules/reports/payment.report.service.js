import { Payment } from '../payments/payment.model.js';

export async function getPaymentReport(tenant, { from, to } = {}) {
  const match = {
    organizationId: tenant.organizationId,
    branchId: tenant.branchId,
    status: 'RECORDED',
  };
  if (from || to) {
    match.createdAt = {};
    if (from) match.createdAt.$gte = new Date(from);
    if (to) match.createdAt.$lte = new Date(to);
  }

  const byMethod = await Payment.aggregate([
    { $match: match },
    { $group: { _id: '$method', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $project: { method: '$_id', total: 1, count: 1, _id: 0 } },
  ]);

  const grandTotal = byMethod.reduce((sum, m) => sum + m.total, 0);

  return { byMethod, grandTotal };
}


