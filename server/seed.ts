import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from './src/models/User';
import { AuthService } from './src/services/AuthService';

dotenv.config();

/**
 * Single-tenant seed: creates one platform admin account.
 * Tenant creation removed entirely — SescoHub V1 has no white-label concept.
 * SECURITY NOTE: the original seed script hardcoded admin credentials directly
 * in source. Fixed to read from env vars (ADMIN_EMAIL / ADMIN_PASSWORD) with
 * dev-only fallbacks, so real credentials never live in version control.
 */
async function seed() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sescohub';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB for seeding...');

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@sescohub.local';
    const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMe123!';

    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      const hashedPassword = await AuthService.hashPassword(adminPassword);
      await User.create({
        name: 'SescoHub Admin',
        email: adminEmail,
        password: hashedPassword,
        role: 'admin',
        status: 'active'
      });
      console.log(`Admin account created for: ${adminEmail}`);
      console.log('Set ADMIN_EMAIL / ADMIN_PASSWORD in your .env before running this in production.');
    } else {
      console.log('Admin already exists — skipping.');
    }

    console.log('Seeding completed.');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();
