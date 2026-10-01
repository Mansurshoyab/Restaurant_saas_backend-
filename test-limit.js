import mongoose from 'mongoose';
import { env } from './src/config/env.js';
import { Order } from './src/modules/orders/order.model.js';
import { getTopProducts } from './src/modules/reports/product.report.service.js';

await mongoose.connect(env.MONGO_URI);
const tenant = { organizationId: new mongoose.Types.ObjectId('64c679a9e3a6a9b4f981e4a1'), branchId: null };
try {
  await getTopProducts(tenant, { limit: "20" });
  console.log("Success with string limit");
} catch (e) {
  console.log("Error:", e.message);
}
process.exit(0);
