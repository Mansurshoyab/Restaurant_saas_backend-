import 'dotenv/config';
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { Role } from '../src/modules/roles/role.model.js';
import { Permission } from '../src/modules/roles/permission.model.js';
import { ROLES } from '../src/config/constants.js';

const PERMISSIONS = [
  { key: 'order:create', module: 'order' },
  { key: 'order:cancel', module: 'order' },
  { key: 'order:update_status', module: 'order' }, // NEW — advance CONFIRMED→PREPARING→READY→SERVED
  { key: 'payment:record', module: 'payment' },
  { key: 'inventory:manage', module: 'inventory' },
  { key: 'purchase:manage', module: 'purchase' },
  { key: 'report:view', module: 'report' },
  { key: 'user:manage', module: 'user' },
  { key: 'settings:manage', module: 'settings' },
];

const SYSTEM_ROLES = [
  { key: ROLES.ORG_ADMIN, name: 'Organization Admin', permissions: PERMISSIONS.map((p) => p.key) },
  {
    key: ROLES.BRANCH_MANAGER,
    name: 'Branch Manager',
    permissions: ['order:create', 'order:cancel', 'order:update_status', 'payment:record', 'inventory:manage', 'purchase:manage', 'report:view'],
  },
  { key: ROLES.CASHIER, name: 'Cashier', permissions: ['order:create', 'order:update_status', 'payment:record'] },
  { key: ROLES.WAITER, name: 'Waiter', permissions: ['order:create', 'order:update_status'] },
  { key: ROLES.INVENTORY_MANAGER, name: 'Inventory Manager', permissions: ['inventory:manage', 'purchase:manage'] },
  { key: ROLES.PURCHASE_MANAGER, name: 'Purchase Manager', permissions: ['purchase:manage'] },
  { key: ROLES.KITCHEN, name: 'Kitchen Staff', permissions: ['order:update_status'] }, // FIXED — was []
  { key: ROLES.ACCOUNTANT, name: 'Accountant', permissions: ['report:view'] },
];

async function seed() {
  await mongoose.connect(env.MONGO_URI);
  console.log('Connected. Seeding...');

  for (const p of PERMISSIONS) {
    await Permission.updateOne({ key: p.key }, { $set: p }, { upsert: true });
  }

  for (const r of SYSTEM_ROLES) {
    await Role.updateOne(
      { organizationId: null, key: r.key },
      { $set: { ...r, organizationId: null, isSystem: true } },
      { upsert: true }
    );
  }

  console.log('Seed complete.');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

