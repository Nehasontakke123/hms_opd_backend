import Patient from '../models/Patient.js';

// @desc    Get all prescriptions (view-only for medical records team)
// @route   GET /api/medical-records/prescriptions
// @access  Private/Medical
export const getAllPrescriptions = async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    // Build query - only patients with prescriptions
    let query = { prescription: { $exists: true, $ne: null } };

    // Search filter
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { mobileNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const patients = await Patient.find(query)
      .populate('doctor', 'fullName specialization qualification')
      .sort({ 'prescription.createdAt': -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');

    const total = await Patient.countDocuments(query);

    res.status(200).json({
      success: true,
      data: patients,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
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

// @desc    Get prescription statistics
// @route   GET /api/medical-records/stats
// @access  Private/Medical
export const getPrescriptionStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalPrescriptions = await Patient.countDocuments({
      prescription: { $exists: true, $ne: null }
    });

    const todayPrescriptions = await Patient.countDocuments({
      'prescription.createdAt': { $gte: today }
    });

    res.status(200).json({
      success: true,
      data: {
        totalPrescriptions,
        todayPrescriptions
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

// @desc    Get prescription by ID
// @route   GET /api/medical-records/prescription/:prescriptionId
// @access  Private/Medical
export const getPrescriptionById = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.prescriptionId)
      .populate('doctor', 'fullName specialization qualification email');

    if (!patient || !patient.prescription) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found'
      });
    }

    res.status(200).json({
      success: true,
      data: patient
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

