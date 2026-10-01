import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from '../src/config/env.js';

import { Organization } from '../src/modules/organizations/organization.model.js';
import { Branch } from '../src/modules/branches/branch.model.js';
import { User } from '../src/modules/users/user.model.js';
import { Role } from '../src/modules/roles/role.model.js';
import { Subscription } from '../src/modules/subscriptions/subscription.model.js';
import { RestaurantSettings } from '../src/modules/settings/restaurantSettings.model.js';
import { Category } from '../src/modules/categories/category.model.js';
import { InventoryCategory } from '../src/modules/inventory/inventoryCategory.model.js';
import { InventoryItem } from '../src/modules/inventory/inventoryItem.model.js';
import { StockBalance } from '../src/modules/stock/stockBalance.model.js';
import { ModifierGroup } from '../src/modules/modifiers/modifierGroup.model.js';
import { Modifier } from '../src/modules/modifiers/modifier.model.js';
import { MenuProduct } from '../src/modules/products/product.model.js';
import { Recipe } from '../src/modules/recipes/recipe.model.js';
import { Supplier } from '../src/modules/suppliers/supplier.model.js';
import { DiningArea } from '../src/modules/tables/diningArea.model.js';
import { Table } from '../src/modules/tables/table.model.js';

import { ROLES, SUBSCRIPTION_STATUS, INVENTORY_UNIT } from '../src/config/constants.js';

const SALT_ROUNDS = 12;

async function seedDemo() {
  await mongoose.connect(env.MONGO_URI);
  console.log('Connected. Seeding demo restaurant...\n');

  // Guard against re-running against a DB that already has this demo org
  const existing = await Organization.findOne({ name: 'Burger House Demo' });
  if (existing) {
    console.log('Demo organization already exists. Skipping. Delete it manually to reseed.');
    await mongoose.disconnect();
    return;
  }

  // --- 1. Organization + Branch ---
  const organization = await Organization.create({
    name: 'Burger House Demo',
    status: 'ACTIVE',
  });

  const branch = await Branch.create({
    organizationId: organization._id,
    name: 'Main Branch',
    address: 'House 12, Road 5, Dhanmondi, Dhaka',
    phone: '01700000000',
    status: 'ACTIVE',
  });

  console.log(`✓ Organization: ${organization.name} (${organization._id})`);
  console.log(`✓ Branch: ${branch.name} (${branch._id})`);

  const tenant = { organizationId: organization._id, branchId: branch._id };

  // --- 2. OrgAdmin user ---
  const orgAdminRole = await Role.findOne({ organizationId: null, key: ROLES.ORG_ADMIN });
  if (!orgAdminRole) {
    throw new Error('System roles not found. Run `npm run seed` before `npm run seed:demo`.');
  }

  const passwordHash = await bcrypt.hash('password123', SALT_ROUNDS);

  const owner = await User.create({
    organizationId: organization._id,
    branchId: branch._id,
    roleId: orgAdminRole._id,
    name: 'Rahim Uddin',
    email: 'owner@burgerhouse.demo',
    phone: '01711111111',
    passwordHash,
    isSuperAdmin: false,
    isActive: true,
  });

  organization.ownerId = owner._id;
  await organization.save();

  console.log(`✓ OrgAdmin: owner@burgerhouse.demo / password123`);

  // --- 3. A cashier too, for testing role-restricted endpoints ---
  const cashierRole = await Role.findOne({ organizationId: null, key: ROLES.CASHIER });
  const cashier = await User.create({
    organizationId: organization._id,
    branchId: branch._id,
    roleId: cashierRole._id,
    name: 'Karim Ahmed',
    phone: '01722222222',
    passwordHash: await bcrypt.hash('password123', SALT_ROUNDS),
    isSuperAdmin: false,
    isActive: true,
  });
  console.log(`✓ Cashier: phone 01722222222 / password123`);

  // --- 4. Subscription (ACTIVE, not just TRIAL, for realistic testing) ---
  await Subscription.create({
    organizationId: organization._id,
    plan: 'MONTHLY',
    status: SUBSCRIPTION_STATUS.ACTIVE,
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    amount: 200000, // 2000.00 BDT in minor units
    paymentReference: 'DEMO-SEED',
    verifiedAt: new Date(),
  });

  // --- 5. Restaurant settings ---
  await RestaurantSettings.create({
    organizationId: organization._id,
    currency: 'BDT',
    taxRatePercent: 5,
    taxInclusive: false,
    receiptHeader: 'Burger House',
    receiptFooter: 'Thank you for visiting!',
  });
  console.log('✓ Restaurant settings (5% tax)');

  // --- 6. Dining area + tables ---
  const diningArea = await DiningArea.create({
    organizationId: organization._id,
    branchId: branch._id,
    name: 'Ground Floor',
  });

  const tableLabels = ['A1', 'A2', 'A3', 'A4', 'B1', 'B2'];
  const tables = await Table.insertMany(
    tableLabels.map((label) => ({
      organizationId: organization._id,
      branchId: branch._id,
      diningAreaId: diningArea._id,
      label,
      seats: 4,
    }))
  );
  console.log(`✓ Dining area + ${tables.length} tables`);

  // --- 7. Inventory categories + items ---
  const [rawIngredientsCategory, packagingCategory] = await InventoryCategory.create([
    { organizationId: organization._id, name: 'Raw Ingredients' },
    { organizationId: organization._id, name: 'Packaging' },
  ]);

  const inventoryItemDefs = [
    { name: 'Chicken Breast', unit: INVENTORY_UNIT.KG, categoryId: rawIngredientsCategory._id },
    { name: 'Beef', unit: INVENTORY_UNIT.KG, categoryId: rawIngredientsCategory._id },
    { name: 'Burger Bun', unit: INVENTORY_UNIT.PIECE, categoryId: rawIngredientsCategory._id },
    { name: 'Cheese Slice', unit: INVENTORY_UNIT.PIECE, categoryId: rawIngredientsCategory._id },
    { name: 'Lettuce', unit: INVENTORY_UNIT.KG, categoryId: rawIngredientsCategory._id },
    { name: 'Tomato', unit: INVENTORY_UNIT.KG, categoryId: rawIngredientsCategory._id },
    { name: 'Burger Sauce', unit: INVENTORY_UNIT.KG, categoryId: rawIngredientsCategory._id },
    { name: 'Cooking Oil', unit: INVENTORY_UNIT.LITER, categoryId: rawIngredientsCategory._id },
    { name: 'Pizza Dough', unit: INVENTORY_UNIT.PIECE, categoryId: rawIngredientsCategory._id },
    { name: 'Mozzarella Cheese', unit: INVENTORY_UNIT.KG, categoryId: rawIngredientsCategory._id },
    { name: 'Cola Syrup', unit: INVENTORY_UNIT.LITER, categoryId: rawIngredientsCategory._id },
    { name: 'Burger Box', unit: INVENTORY_UNIT.PIECE, categoryId: packagingCategory._id },
    { name: 'Paper Cup', unit: INVENTORY_UNIT.PIECE, categoryId: packagingCategory._id },
  ];

  const inventoryItems = await InventoryItem.insertMany(
    inventoryItemDefs.map((def) => ({
      organizationId: organization._id,
      name: def.name,
      unit: def.unit,
      categoryId: def.categoryId,
      averageCost: 0, // set properly once a purchase is received
    }))
  );
  const itemByName = Object.fromEntries(inventoryItems.map((i) => [i.name, i]));

  // Seed StockBalance rows with realistic opening stock + reorder levels,
  // and set averageCost directly (bypassing the purchase flow, since this
  // is opening/demo stock, not a supplier receipt).
  const openingStock = {
    'Chicken Breast': { qty: 20, cost: 400, reorder: 5 },
    Beef: { qty: 15, cost: 550, reorder: 5 },
    'Burger Bun': { qty: 200, cost: 8, reorder: 30 },
    'Cheese Slice': { qty: 300, cost: 5, reorder: 50 },
    Lettuce: { qty: 8, cost: 60, reorder: 2 },
    Tomato: { qty: 10, cost: 50, reorder: 2 },
    'Burger Sauce': { qty: 5, cost: 200, reorder: 1 },
    'Cooking Oil': { qty: 20, cost: 180, reorder: 5 },
    'Pizza Dough': { qty: 50, cost: 25, reorder: 10 },
    'Mozzarella Cheese': { qty: 10, cost: 700, reorder: 2 },
    'Cola Syrup': { qty: 10, cost: 300, reorder: 2 },
    'Burger Box': { qty: 500, cost: 4, reorder: 100 },
    'Paper Cup': { qty: 500, cost: 2, reorder: 100 },
  };

  for (const [name, { qty, cost, reorder }] of Object.entries(openingStock)) {
    const item = itemByName[name];
    await StockBalance.create({
      organizationId: organization._id,
      branchId: branch._id,
      inventoryItemId: item._id,
      quantity: qty,
      minimumStock: Math.round(reorder / 2),
      reorderLevel: reorder,
      maximumStock: qty * 3,
    });
    item.averageCost = cost;
    await item.save();
  }
  console.log(`✓ ${inventoryItems.length} inventory items with opening stock`);

  // --- 8. Supplier ---
  await Supplier.create({
    organizationId: organization._id,
    name: 'ABC Food Supply Co.',
    contactPerson: 'Mr. Kamal',
    phone: '01733333333',
    email: 'sales@abcfoodsupply.demo',
    address: 'Karwan Bazar, Dhaka',
    paymentTerms: 'Net 15',
  });
  console.log('✓ Supplier: ABC Food Supply Co.');

  // --- 9. Categories + modifier groups ---
  const [burgersCategory, pizzaCategory, drinksCategory] = await Category.create([
    { organizationId: organization._id, name: 'Burgers', sortOrder: 1 },
    { organizationId: organization._id, name: 'Pizza', sortOrder: 2 },
    { organizationId: organization._id, name: 'Drinks', sortOrder: 3 },
  ]);

  const addOnsGroup = await ModifierGroup.create({
    organizationId: organization._id,
    name: 'Add-ons',
    selectionType: 'MULTIPLE',
    required: false,
  });
  await Modifier.insertMany([
    { organizationId: organization._id, modifierGroupId: addOnsGroup._id, name: 'Extra Cheese', price: 30, sortOrder: 1 },
    { organizationId: organization._id, modifierGroupId: addOnsGroup._id, name: 'Extra Sauce', price: 20, sortOrder: 2 },
    { organizationId: organization._id, modifierGroupId: addOnsGroup._id, name: 'Extra Fries', price: 100, sortOrder: 3 },
  ]);

  const pizzaSizeGroup = await ModifierGroup.create({
    organizationId: organization._id,
    name: 'Pizza Size',
    selectionType: 'SINGLE',
    required: true,
    minSelect: 1,
    maxSelect: 1,
  });
  await Modifier.insertMany([
    { organizationId: organization._id, modifierGroupId: pizzaSizeGroup._id, name: 'Small', price: 0, sortOrder: 1 },
    { organizationId: organization._id, modifierGroupId: pizzaSizeGroup._id, name: 'Medium', price: 150, sortOrder: 2 },
    { organizationId: organization._id, modifierGroupId: pizzaSizeGroup._id, name: 'Large', price: 300, sortOrder: 3 },
  ]);

  console.log('✓ 3 categories, 2 modifier groups (Add-ons, Pizza Size)');

  // --- 10. Menu products + recipes ---
  const chickenBurger = await MenuProduct.create({
    organizationId: organization._id,
    name: 'Chicken Burger',
    sku: 'BRG-CHK-01',
    categoryId: burgersCategory._id,
    price: 250,
    tax: 0,
    modifierGroupIds: [addOnsGroup._id],
  });

  const beefBurger = await MenuProduct.create({
    organizationId: organization._id,
    name: 'Beef Burger',
    sku: 'BRG-BEEF-01',
    categoryId: burgersCategory._id,
    price: 320,
    tax: 0,
    modifierGroupIds: [addOnsGroup._id],
  });

  const chickenPizza = await MenuProduct.create({
    organizationId: organization._id,
    name: 'Chicken Pizza',
    sku: 'PIZ-CHK-01',
    categoryId: pizzaCategory._id,
    price: 650,
    tax: 0,
    modifierGroupIds: [pizzaSizeGroup._id],
  });

  const coke = await MenuProduct.create({
    organizationId: organization._id,
    name: 'Coke',
    sku: 'DRK-COKE-01',
    categoryId: drinksCategory._id,
    price: 60,
    tax: 0,
  });

  console.log('✓ 4 menu products: Chicken Burger, Beef Burger, Chicken Pizza, Coke');

  // Recipes — matches the design doc's §13 example exactly
  const chickenBurgerRecipe = await Recipe.create({
    organizationId: organization._id,
    productId: chickenBurger._id,
    version: 1,
    active: true,
    items: [
      { inventoryItemId: itemByName['Chicken Breast']._id, quantity: 0.15, unit: 'kg' },
      { inventoryItemId: itemByName['Burger Bun']._id, quantity: 1, unit: 'piece' },
      { inventoryItemId: itemByName['Cheese Slice']._id, quantity: 1, unit: 'piece' },
      { inventoryItemId: itemByName['Burger Sauce']._id, quantity: 0.02, unit: 'kg' },
      { inventoryItemId: itemByName['Lettuce']._id, quantity: 0.03, unit: 'kg' },
      { inventoryItemId: itemByName['Burger Box']._id, quantity: 1, unit: 'piece' },
    ],
  });
  chickenBurger.recipeId = chickenBurgerRecipe._id;
  await chickenBurger.save();

  const beefBurgerRecipe = await Recipe.create({
    organizationId: organization._id,
    productId: beefBurger._id,
    version: 1,
    active: true,
    items: [
      { inventoryItemId: itemByName['Beef']._id, quantity: 0.18, unit: 'kg' },
      { inventoryItemId: itemByName['Burger Bun']._id, quantity: 1, unit: 'piece' },
      { inventoryItemId: itemByName['Cheese Slice']._id, quantity: 1, unit: 'piece' },
      { inventoryItemId: itemByName['Tomato']._id, quantity: 0.03, unit: 'kg' },
      { inventoryItemId: itemByName['Burger Box']._id, quantity: 1, unit: 'piece' },
    ],
  });
  beefBurger.recipeId = beefBurgerRecipe._id;
  await beefBurger.save();

  const pizzaRecipe = await Recipe.create({
    organizationId: organization._id,
    productId: chickenPizza._id,
    version: 1,
    active: true,
    items: [
      { inventoryItemId: itemByName['Pizza Dough']._id, quantity: 1, unit: 'piece' },
      { inventoryItemId: itemByName['Chicken Breast']._id, quantity: 0.1, unit: 'kg' },
      { inventoryItemId: itemByName['Mozzarella Cheese']._id, quantity: 0.12, unit: 'kg' },
    ],
  });
  chickenPizza.recipeId = pizzaRecipe._id;
  await chickenPizza.save();

  const cokeRecipe = await Recipe.create({
    organizationId: organization._id,
    productId: coke._id,
    version: 1,
    active: true,
    items: [
      { inventoryItemId: itemByName['Cola Syrup']._id, quantity: 0.05, unit: 'liter' },
      { inventoryItemId: itemByName['Paper Cup']._id, quantity: 1, unit: 'piece' },
    ],
  });
  coke.recipeId = cokeRecipe._id;
  await coke.save();

  console.log('✓ Recipes linked for all 4 products (matches §13/§21 design doc examples)');

  console.log('\n========================================');
  console.log('Demo seed complete!');
  console.log('========================================');
  console.log(`Organization ID: ${organization._id}`);
  console.log(`Branch ID:       ${branch._id}`);
  console.log('');
  console.log('Login as OrgAdmin:');
  console.log('  POST /api/v1/auth/login');
  console.log('  { "email": "owner@burgerhouse.demo", "password": "password123" }');
  console.log('');
  console.log('Login as Cashier (phone+OTP flow):');
  console.log('  POST /api/v1/auth/otp/request { "phone": "01722222222" }');
  console.log('  (check BulkSMS logs / your phone for the code)');
  console.log('========================================\n');

  await mongoose.disconnect();
}

seedDemo().catch((err) => {
  console.error('Demo seed failed:', err);
  process.exit(1);
});


