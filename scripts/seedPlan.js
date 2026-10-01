import 'dotenv/config';
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { Plan } from '../src/modules/platform/plan.model.js';

async function seedPlan() {
  await mongoose.connect(env.MONGO_URI);

  const existing = await Plan.findOne({ key: 'STANDARD' });
  if (existing) {
    console.log('STANDARD plan already exists. Skipping.');
    await mongoose.disconnect();
    return;
  }

  const plan = await Plan.create({
    name: 'Standard',
    key: 'STANDARD',
    billingCycle: 'MONTHLY',
    price: 500,
    limits: {
      maxBranches: null, // unlimited — single-tier plan, no gating for now
      maxUsers: null,
      maxProducts: null,
    },
    features: ['pos', 'inventory', 'recipes', 'purchasing', 'reports'],
    sortOrder: 1,
  });

  console.log(`✓ Plan created: ${plan.name} — ${plan.price} BDT/${plan.billingCycle} (${plan._id})`);
  await mongoose.disconnect();
}

seedPlan().catch((err) => {
  console.error(err);
  process.exit(1);
});


