import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { DiningArea } from './src/modules/tables/diningArea.model.js';
import { Table } from './src/modules/tables/table.model.js';

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');

  const orgId = new mongoose.Types.ObjectId('6aaba259be2116ffa8ecebe2');
  const branchId = new mongoose.Types.ObjectId('6aaba259be2116ffa8ecebe3');

  const mainArea = await DiningArea.create({
    organizationId: orgId,
    branchId: branchId,
    name: 'Main Hall'
  });
  
  const patioArea = await DiningArea.create({
    organizationId: orgId,
    branchId: branchId,
    name: 'Outdoor Patio'
  });

  const tables = [];
  for (let i = 1; i <= 5; i++) {
    tables.push({
      organizationId: orgId,
      branchId: branchId,
      diningAreaId: mainArea._id,
      label: `M${i}`,
      seats: 4
    });
  }
  
  for (let i = 1; i <= 3; i++) {
    tables.push({
      organizationId: orgId,
      branchId: branchId,
      diningAreaId: patioArea._id,
      label: `P${i}`,
      seats: 2
    });
  }

  await Table.insertMany(tables);
  console.log('Created dining areas and tables!');
  process.exit(0);
}

seed().catch(console.error);
