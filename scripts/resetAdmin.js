const mongoose = require('mongoose');
const User = require('../models/User');
const dotenv = require('dotenv');

dotenv.config();

const resetAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');

    // Delete existing admin
    await User.deleteOne({ email: 'admin@tekisky.com' });
    console.log('✅ Deleted existing admin user');

    // Create admin user
    const admin = await User.create({
      fullName: 'Admin User',
      email: 'admin@tekisky.com',
      password: 'admin123',
      role: 'admin'
    });

    console.log('✅ Admin user created successfully!');
    console.log('Email: admin@tekisky.com');
    console.log('Password: admin123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

resetAdmin();
