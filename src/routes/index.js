import { Router } from 'express';

import authRoutes from '../modules/auth/auth.routes.js';
import organizationRoutes from '../modules/organizations/organization.routes.js';
import branchRoutes from '../modules/branches/branch.routes.js';
import subscriptionRoutes from '../modules/subscriptions/subscription.routes.js';
import userRoutes from '../modules/users/user.routes.js';
import roleRoutes from '../modules/roles/role.routes.js';
import categoryRoutes from '../modules/categories/category.routes.js';
import modifierRoutes from '../modules/modifiers/modifier.routes.js';
import productRoutes from '../modules/products/product.routes.js';
import inventoryItemRoutes from '../modules/inventory/inventoryItem.routes.js';
import stockRoutes from '../modules/stock/stock.routes.js';
import recipeRoutes from '../modules/recipes/recipe.routes.js';
import supplierRoutes from '../modules/suppliers/supplier.routes.js';
import purchaseRoutes from '../modules/purchases/purchase.routes.js';
import tableRoutes from '../modules/tables/table.routes.js';
import orderRoutes from '../modules/orders/order.routes.js';
import paymentRoutes from '../modules/payments/payment.routes.js';
import settingsRoutes from '../modules/settings/settings.routes.js';
import customerRoutes from '../modules/customers/customer.routes.js';
import shiftRoutes from '../modules/shifts/shift.routes.js';
import expenseRoutes from '../modules/expenses/expense.routes.js';
import notificationRoutes from '../modules/notifications/notification.routes.js';
import auditRoutes from '../modules/audit/audit.routes.js';
import reportRoutes from '../modules/reports/report.routes.js';
import platformRoutes from '../modules/platform/platform.routes.js';


const router = Router();

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'API is healthy', timestamp: new Date().toISOString() });
});

router.use('/auth', authRoutes);
router.use('/organizations', organizationRoutes);
router.use('/branches', branchRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/users', userRoutes);
router.use('/roles', roleRoutes);
router.use('/categories', categoryRoutes);
router.use('/modifiers', modifierRoutes);
router.use('/products', productRoutes);
router.use('/inventory', inventoryItemRoutes);
router.use('/stock', stockRoutes);
router.use('/recipes', recipeRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/purchases', purchaseRoutes);
router.use('/tables', tableRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/settings', settingsRoutes);
router.use('/customers', customerRoutes);
router.use('/pos/shifts', shiftRoutes);
router.use('/expenses', expenseRoutes);
router.use('/notifications', notificationRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/reports', reportRoutes);
router.use('/platform', platformRoutes);



export default router;


