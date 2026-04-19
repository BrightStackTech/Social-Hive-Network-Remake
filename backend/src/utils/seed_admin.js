import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/user.model.js';

dotenv.config();

const seedAdmin = async () => {
  try {
    // Correctly path to .env if needed
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB');

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      existingAdmin.isAdmin = true;
      existingAdmin.password = adminPassword;
      await existingAdmin.save();
      console.log('Admin user updated successfully');
    } else {
      await User.create({
        username: 'admin',
        email: adminEmail,
        password: adminPassword,
        isAdmin: true,
        isEmailVerified: true,
      });
      console.log('Admin user created successfully');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();
