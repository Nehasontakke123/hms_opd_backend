const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const Patient = require('../models/Patient');

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
        isLimitReached
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

module.exports = router;
