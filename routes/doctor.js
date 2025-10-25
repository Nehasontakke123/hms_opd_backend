const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');

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

module.exports = router;
