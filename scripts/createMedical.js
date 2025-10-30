import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');

    const email = 'medical@tekisky.com';

    const existing = await User.findOne({ email });
    if (existing) {
      if (existing.role !== 'medical') {
        existing.role = 'medical';
        await existing.save();
        console.log('✅ Existing user role updated to medical:', email);
      } else {
        console.log('ℹ️ Medical user already exists:', email);
      }
      process.exit(0);
    }

    await User.create({
      fullName: 'Medical Staff',
      email,
      password: 'medical123',
      role: 'medical',
      isActive: true
    });

    console.log('✅ Medical user created');
    console.log('Email: medical@tekisky.com');
    console.log('Password: medical123');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
};

run();



