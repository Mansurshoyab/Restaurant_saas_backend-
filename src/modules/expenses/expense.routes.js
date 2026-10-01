import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { resolveTenant } from '../../middleware/tenant.middleware.js';
import { authorize } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { createExpenseSchema, createExpenseCategorySchema } from './expense.validation.js';
import * as expenseController from './expense.controller.js';

const router = Router();

router.use(authenticate, resolveTenant, authorize('report:view'));

router.get('/categories', expenseController.listCategories);
router.post('/categories', validate({ body: createExpenseCategorySchema }), expenseController.createCategory);

router.get('/', expenseController.listExpenses);
router.post('/', validate({ body: createExpenseSchema }), expenseController.createExpense);
router.delete('/:id', expenseController.deleteExpense);

export default router;


