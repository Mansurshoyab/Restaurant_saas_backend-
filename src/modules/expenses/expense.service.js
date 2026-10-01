import { ExpenseCategory } from './expenseCategory.model.js';
import { Expense } from './expense.model.js';
import { ApiError } from '../../common/utils/apiError.js';

export async function createExpense(tenant, userId, input) {
  return Expense.create({
    ...input,
    organizationId: tenant.organizationId,
    branchId: tenant.branchId,
    paidBy: userId,
    expenseDate: input.expenseDate ? new Date(input.expenseDate) : new Date(),
  });
}

export async function listExpenses(tenant, { from, to, category } = {}) {
  const query = {};
  if (category) query.category = category;
  if (from || to) {
    query.expenseDate = {};
    if (from) query.expenseDate.$gte = new Date(from);
    if (to) query.expenseDate.$lte = new Date(to);
  }
  return Expense.find(query).populate('paidBy', 'name').sort({ expenseDate: -1 }).setOptions({ tenant });
}

export async function deleteExpense(tenant, expenseId) {
  const result = await Expense.findOneAndDelete({ _id: expenseId }).setOptions({ tenant });
  if (!result) throw ApiError.notFound('Expense not found');
  return true;
}

export async function createExpenseCategory(tenant, input) {
  return ExpenseCategory.create({
    ...input,
    organizationId: tenant.organizationId,
  });
}

export async function listExpenseCategories(tenant) {
  return ExpenseCategory.find({ isActive: true }).setOptions({ tenant });
}
