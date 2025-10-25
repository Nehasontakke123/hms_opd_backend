const Patient = require('../models/Patient');

// @desc    Create/Update prescription
// @route   PUT /api/prescription/:patientId
// @access  Private/Doctor
exports.createPrescription = async (req, res) => {
  try {
    const { diagnosis, medicines, notes } = req.body;

    // Validation
    if (!diagnosis || !medicines || medicines.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide diagnosis and at least one medicine'
      });
    }

    const patient = await Patient.findById(req.params.patientId);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Update prescription
    patient.prescription = {
      diagnosis,
      medicines,
      notes: notes || '',
      createdAt: new Date()
    };

    patient.status = 'completed';

    await patient.save();
    await patient.populate('doctor', 'fullName specialization');

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

// @desc    Get patient by ID
// @route   GET /api/prescription/patient/:patientId
// @access  Private
exports.getPatientById = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.patientId)
      .populate('doctor', 'fullName specialization email');

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
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
