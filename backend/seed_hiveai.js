import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './src/models/user.model.js';

dotenv.config();

const hiveaiData = {
  username: 'hiveai',
  email: process.env.HIVEAI_EMAIL,
  password: process.env.HIVEAI_PASSWORD,
  profilePicture: 'https://res.cloudinary.com/domckasfk/image/upload/v1773008287/social-hive-mini-project_tzq4ns.png',
  bio: 'I am HiveAI, your intelligent companion for Social Hive Network. Mention me with @hiveai to ask questions!',
  isEmailVerified: true,
};

async function seedHiveAI() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB');

    let user = await User.findOne({ username: 'hiveai' });

    if (user) {
      console.log('HiveAI user already exists. Updating...');
      user.email = hiveaiData.email;
      user.profilePicture = hiveaiData.profilePicture;
      user.bio = hiveaiData.bio;
      user.isEmailVerified = true;
      // Re-hash password just in case user wants to reset it via this script
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(hiveaiData.password, salt);
      await user.save();
    } else {
      console.log('Creating HiveAI user...');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(hiveaiData.password, salt);
      user = await User.create({
        ...hiveaiData,
        password: hashedPassword,
      });
    }

    console.log('HiveAI User Seeded Successfully!');
    console.log('User ID:', user._id.toString());
    console.log('Email:', user.email);
    console.log('Password:', hiveaiData.password);
    console.log('IMPORTANT: Add HIVEAI_BOT_ID=' + user._id.toString() + ' to your .env file');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding HiveAI user:', error);
    process.exit(1);
  }
}

seedHiveAI();
