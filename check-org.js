import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const org = await mongoose.connection.db.collection('organizations').findOne({});
  const branch = await mongoose.connection.db.collection('branches').findOne({});
  console.log('Org:', org);
  console.log('Branch:', branch);
  process.exit(0);
}
run();
