const Patient = require('../models/Patient');

// @desc    Register new patient
// @route   POST /api/patient/register
// @access  Private/Receptionist
exports.registerPatient = async (req, res) => {
  try {
    const { fullName, mobileNumber, address, age, disease, doctor, fees } = req.body;

    // Validation
    if (!fullName || !mobileNumber || !address || !age || !disease || !doctor) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Get today's date at midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get the last token number for today
    const lastPatient = await Patient.findOne({
      registrationDate: {
        $gte: today,
        $lt: tomorrow
      }
    }).sort({ tokenNumber: -1 });

    // Generate next token number
    const tokenNumber = lastPatient ? lastPatient.tokenNumber + 1 : 1;

    // Create patient
    const patient = await Patient.create({
      fullName,
      mobileNumber,
      address,
      age,
      disease,
      doctor,
      fees: fees || 0,
      tokenNumber
    });

    await patient.populate('doctor', 'fullName specialization');

    res.status(201).json({
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

// @desc    Get patients for today by doctor
// @route   GET /api/patient/today/:doctorId
// @access  Private
exports.getTodayPatients = async (req, res) => {
  try {
    const doctorId = req.params.doctorId;

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const patients = await Patient.find({
      doctor: doctorId,
      registrationDate: {
        $gte: today,
        $lt: tomorrow
      }
    })
    .populate('doctor', 'fullName specialization')
    .sort({ tokenNumber: 1 });

    res.status(200).json({
      success: true,
      count: patients.length,
      data: patients
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get all patients
// @route   GET /api/patient
// @access  Private
exports.getAllPatients = async (req, res) => {
  try {
    const patients = await Patient.find()
      .populate('doctor', 'fullName specialization fees')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: patients.length,
      data: patients
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};
