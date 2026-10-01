import mongoose from 'mongoose';
import { env } from './src/config/env.js';
import { InventoryItem } from './src/modules/inventory/inventoryItem.model.js';

await mongoose.connect(env.MONGO_URI);
const items = await InventoryItem.find({ name: { $in: ['Chicken Breast', 'Flour'] } }).setOptions({ skipTenantScope: true });
console.log(items.map(i => `${i.name}: averageCost=${i.averageCost}`));
process.exit(0);
