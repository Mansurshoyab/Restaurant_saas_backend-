import mongoose from 'mongoose';
import { env } from './src/config/env.js';
import { Order } from './src/modules/orders/order.model.js';
import { getStockValuation } from './src/modules/reports/inventory.report.service.js';

await mongoose.connect(env.MONGO_URI);
const tenant = { organizationId: new mongoose.Types.ObjectId('64c679a9e3a6a9b4f981e4a1'), branchId: null };
try {
  const result = await getStockValuation(tenant);
  console.log("Success:", result);
} catch (e) {
  console.log("Error:", e.message);
}
process.exit(0);
