import mongoose from 'mongoose';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const fixDoctorAvailability = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');

    // Update all doctors who don't have isAvailable set
    const result = await User.updateMany(
      { 
        role: 'doctor',
        isAvailable: { $exists: false } // Only update doctors where isAvailable doesn't exist
      },
      { 
        $set: { isAvailable: true }
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} doctors to set isAvailable = true`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

fixDoctorAvailability();














