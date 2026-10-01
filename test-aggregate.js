import mongoose from 'mongoose';
import { env } from './src/config/env.js';
import { Order } from './src/modules/orders/order.model.js';
import { getTopProducts } from './src/modules/reports/product.report.service.js';

await mongoose.connect(env.MONGO_URI);

const order = await Order.findOne({ status: 'COMPLETED' }).setOptions({ skipTenantScope: true });
console.log('Found completed order:', order ? order.orderNumber : 'none');

if (order) {
  const tenant = {
    organizationId: order.organizationId,
    branchId: order.branchId
  };
  const result = await getTopProducts(tenant, {});
  console.log('Result:', result);
}
process.exit(0);
