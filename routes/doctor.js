import express from 'express';
import multer from 'multer';
import { protect } from '../middleware/auth.js';
import User from '../models/User.js';
import Patient from '../models/Patient.js';
import { v2 as cloudinary } from 'cloudinary';

const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Get all doctors
router.get('/', protect, async (req, res) => {
  try {
    const doctors = await User.find({ role: 'doctor', isActive: true })
      .select('-password')
      .sort({ fullName: 1 });

    res.status(200).json({
      success: true,
      count: doctors.length,
      data: doctors
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Set or update daily patient limit
router.put('/:doctorId/patient-limit', protect, async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { dailyPatientLimit } = req.body;

    // Validation
    if (!dailyPatientLimit || dailyPatientLimit < 1 || dailyPatientLimit > 100) {
      return res.status(400).json({
        success: false,
        message: 'Daily patient limit must be between 1 and 100'
      });
    }

    // Check if user is doctor/receptionist/admin
    if (!['admin', 'doctor', 'receptionist'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update patient limit'
      });
    }

    // Find and update doctor
    const doctor = await User.findById(doctorId);
    
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    doctor.dailyPatientLimit = dailyPatientLimit;
    doctor.lastLimitResetDate = new Date();
    await doctor.save();

    res.status(200).json({
      success: true,
      message: `Daily patient limit set to ${dailyPatientLimit}`,
      data: {
        doctorId: doctor._id,
        fullName: doctor.fullName,
        dailyPatientLimit: doctor.dailyPatientLimit
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Get doctor's patient statistics (count vs limit)
router.get('/:doctorId/stats', protect, async (req, res) => {
  try {
    const { doctorId } = req.params;

    // Find doctor
    const doctor = await User.findById(doctorId).select('-password');
    
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Count today's patients for this doctor
    const todayPatientCount = await Patient.countDocuments({
      doctor: doctorId,
      registrationDate: {
        $gte: today,
        $lt: tomorrow
      }
    });

    const remainingSlots = doctor.dailyPatientLimit - todayPatientCount;
    const isLimitReached = todayPatientCount >= doctor.dailyPatientLimit;

    res.status(200).json({
      success: true,
      data: {
        doctorId: doctor._id,
        fullName: doctor.fullName,
        specialization: doctor.specialization,
        dailyPatientLimit: doctor.dailyPatientLimit,
        todayPatientCount,
        remainingSlots: remainingSlots > 0 ? remainingSlots : 0,
        isLimitReached,
        isAvailable: doctor.isAvailable !== undefined ? doctor.isAvailable : true,
        unavailableReason: doctor.unavailableReason
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Toggle doctor availability
router.put('/:doctorId/availability', protect, async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { isAvailable, unavailableReason } = req.body;

    // Check if user is doctor/receptionist/admin
    if (!['admin', 'doctor', 'receptionist'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update doctor availability'
      });
    }

    // If doctor is marking themselves unavailable, check permissions
    if (req.user.role === 'doctor' && req.user.id !== doctorId) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own availability'
      });
    }

    // Find and update doctor
    const doctor = await User.findById(doctorId);
    
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    doctor.isAvailable = isAvailable !== undefined ? isAvailable : !doctor.isAvailable;
    if (unavailableReason !== undefined) {
      doctor.unavailableReason = unavailableReason || '';
    }

    await doctor.save();

    res.status(200).json({
      success: true,
      message: doctor.isAvailable 
        ? 'Doctor marked as available' 
        : 'Doctor marked as unavailable',
      data: {
        doctorId: doctor._id,
        fullName: doctor.fullName,
        isAvailable: doctor.isAvailable,
        unavailableReason: doctor.unavailableReason
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Upload profile image
router.put('/:doctorId/profile-image', protect, (req, res, next) => {
  upload.single('profileImage')(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload error'
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    const { doctorId } = req.params;

    // Check if user is updating their own profile or is admin
    if (req.user.role === 'doctor' && req.user.id !== doctorId) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own profile'
      });
    }

    if (!['admin', 'doctor'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update profile image'
      });
    }

    // Find doctor
    const doctor = await User.findById(doctorId);
    
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an image file'
      });
    }

    let imageUrl = null;

    // If Cloudinary is configured, upload there
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
      });

      const publicId = `profile_images/doctor_${doctor._id}_${Date.now()}`;

      const uploadResult = await new Promise((resolve, reject) => {
        const upload = cloudinary.uploader.upload_stream(
          {
            public_id: publicId,
            resource_type: 'image',
            overwrite: true,
            folder: 'doctor_profiles'
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        upload.end(req.file.buffer);
      });

      imageUrl = uploadResult.secure_url;
    } else {
      // Fallback: Convert to base64 (for development)
      const base64 = req.file.buffer.toString('base64');
      imageUrl = `data:${req.file.mimetype};base64,${base64}`;
    }

    // Update doctor's profile image
    doctor.profileImage = imageUrl;
    await doctor.save();

    res.status(200).json({
      success: true,
      message: 'Profile image updated successfully',
      data: {
        doctorId: doctor._id,
        fullName: doctor.fullName,
        profileImage: doctor.profileImage
      }
    });
  } catch (error) {
    console.error('Profile image upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

export default router;
