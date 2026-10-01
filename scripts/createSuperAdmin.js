import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import readline from 'readline/promises';
import { stdin, stdout } from 'process';
import { env } from '../src/config/env.js';
import { User } from '../src/modules/users/user.model.js';

const SALT_ROUNDS = 12;

// SuperAdmin cannot be created through the API — there's no route that
// makes one, deliberately. This script is the only way, so a compromised
// OrgAdmin token can never escalate to platform-level access.
async function createSuperAdmin() {
  const rl = readline.createInterface({ input: stdin, output: stdout });

  await mongoose.connect(env.MONGO_URI);

  const name = await rl.question('Name: ');
  const email = await rl.question('Email: ');
  const password = await rl.question('Password (min 8 chars): ');

  rl.close();

  if (!email || !password || password.length < 8) {
    console.error('Email and a password of at least 8 characters are required.');
    process.exit(1);
  }

  const existing = await User.findOne({ email });
  if (existing) {
    console.error(`A user with email ${email} already exists.`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const superAdmin = await User.create({
    organizationId: null,
    branchId: null,
    roleId: null,
    name,
    email,
    passwordHash,
    isSuperAdmin: true,
    isActive: true,
  });

  console.log(`\n✓ SuperAdmin created: ${superAdmin.email} (${superAdmin._id})`);
  console.log('Login via POST /api/v1/auth/login, then use /api/v1/platform/* routes.\n');

  await mongoose.disconnect();
}

createSuperAdmin().catch((err) => {
  console.error('Failed to create SuperAdmin:', err);
  process.exit(1);
});



