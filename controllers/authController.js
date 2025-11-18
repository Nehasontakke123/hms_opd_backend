import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Validation
    if (!email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email, password, and role'
      });
    }

    // Find user by email and role
    const user = await User.findOne({ email, role }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account has been deactivated'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        specialization: user.specialization,
        qualification: user.qualification,
        profileImage: user.profileImage,
        fees: user.fees,
        mobileNumber: user.mobileNumber,
        clinicAddress: user.clinicAddress
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Seed default medical user on deployed backend
// @route   POST /api/auth/seed/medical
// @access  Protected via SEED_KEY
export const seedMedical = async (req, res) => {
  try {
    const providedKey = req.query.key || req.body.key;
    if (!process.env.SEED_KEY || providedKey !== process.env.SEED_KEY) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const email = 'medical@tekisky.com';
    let user = await User.findOne({ email });
    if (user) {
      user.role = 'medical';
      user.isActive = true;
      if (req.body.password) user.password = req.body.password;
      await user.save();
      return res.status(200).json({ success: true, message: 'Medical user ensured', email });
    }

    user = await User.create({
      fullName: 'Medical Staff',
      email,
      password: req.body.password || 'medical123',
      role: 'medical',
      isActive: true
    });
    return res.status(201).json({ success: true, message: 'Medical user created', email });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    // req.user is set by protect middleware
    const user = await User.findById(req.user._id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        specialization: user.specialization,
        qualification: user.qualification,
        profileImage: user.profileImage,
        fees: user.fees,
        mobileNumber: user.mobileNumber,
        clinicAddress: user.clinicAddress,
        isAvailable: user.isAvailable,
        dailyPatientLimit: user.dailyPatientLimit
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};
