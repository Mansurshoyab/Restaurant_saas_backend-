import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { success, created } from '../../common/utils/apiResponse.js';
import * as expenseService from './expense.service.js';

export const createExpense = asyncHandler(async (req, res) => {
  const expense = await expenseService.createExpense(req.tenant, req.user.userId, req.body);
  return created(res, expense, 'Expense recorded');
});

export const listExpenses = asyncHandler(async (req, res) => {
  const expenses = await expenseService.listExpenses(req.tenant, req.query);
  return success(res, { message: 'Expenses', data: expenses });
});

export const deleteExpense = asyncHandler(async (req, res) => {
  await expenseService.deleteExpense(req.tenant, req.params.id);
  return success(res, { message: 'Expense deleted' });
});



export const createCategory = asyncHandler(async (req, res) => {
  const category = await expenseService.createExpenseCategory(req.tenant, req.body);
  return created(res, category, 'Expense category created');
});

export const listCategories = asyncHandler(async (req, res) => {
  const categories = await expenseService.listExpenseCategories(req.tenant);
  return success(res, { message: 'Expense categories', data: categories });
});
