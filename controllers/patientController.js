import Patient from '../models/Patient.js';
import User from '../models/User.js';
import { sendWhatsAppMessage } from '../utils/sendWhatsApp.js';

// @desc    Register new patient
// @route   POST /api/patient/register
// @access  Private/Receptionist
export const registerPatient = async (req, res) => {
  try {
    const {
      fullName,
      mobileNumber,
      address,
      age,
      disease,
      doctor,
      fees,
      visitDate,
      visitTime
    } = req.body;

    // Validation
    if (!fullName || !mobileNumber || !address || !age || !disease || !doctor) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Determine intended registration date/time
    let registrationDate = new Date();

    const parseVisitDate = () => {
      if (!visitDate) return null;
      const [year, month, day] = visitDate.split('-').map(Number);
      if (
        Number.isInteger(year) &&
        Number.isInteger(month) &&
        Number.isInteger(day)
      ) {
        return new Date(year, month - 1, day);
      }
      return null;
    };

    const parsedVisitDate = parseVisitDate();
    if (parsedVisitDate) {
      registrationDate = parsedVisitDate;
    }

    if (visitTime) {
      const [hours, minutes] = visitTime.split(':').map(Number);
      if (
        Number.isInteger(hours) &&
        Number.isInteger(minutes)
      ) {
        registrationDate.setHours(hours, minutes, 0, 0);
      }
    } else if (parsedVisitDate) {
      // Default to 09:00 AM if only date provided
      registrationDate.setHours(9, 0, 0, 0);
    }

    // Calculate day boundaries for limit and token generation
    const dayStart = new Date(registrationDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    // Check doctor's daily patient limit
    const doctorUser = await User.findById(doctor);
    if (!doctorUser) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    // Check if doctor is available
    if (!doctorUser.isAvailable) {
      const reason = doctorUser.unavailableReason ? ` Reason: ${doctorUser.unavailableReason}` : '';
      return res.status(400).json({
        success: false,
        message: `Doctor ${doctorUser.fullName} is currently not available. Please select another doctor.${reason}`,
        doctorNotAvailable: true,
        doctorName: doctorUser.fullName,
        reason: doctorUser.unavailableReason
      });
    }

    // Count today's patients for this doctor
    const todayPatientCount = await Patient.countDocuments({
      doctor: doctor,
      registrationDate: {
        $gte: dayStart,
        $lt: dayEnd
      }
    });

    // Check if limit is reached
    if (todayPatientCount >= doctorUser.dailyPatientLimit) {
      return res.status(400).json({
        success: false,
        message: `Doctor ${doctorUser.fullName} has reached their daily patient limit of ${doctorUser.dailyPatientLimit}. Please select another doctor or try tomorrow.`,
        limitReached: true,
        doctorName: doctorUser.fullName,
        dailyLimit: doctorUser.dailyPatientLimit
      });
    }

    // Get the last token number for today
    const lastPatient = await Patient.findOne({
      doctor,
      registrationDate: {
        $gte: dayStart,
        $lt: dayEnd
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
      tokenNumber,
      registrationDate
    });

    await patient.populate('doctor', 'fullName specialization');

    const whatsappConfigured = Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM);

    if (whatsappConfigured) {
      try {
        const visitDateLabel = new Date(registrationDate).toLocaleString('en-IN', {
          dateStyle: 'long',
          timeStyle: 'short'
        });

        const specializationLabel = doctorUser.specialization ? ` (${doctorUser.specialization})` : '';

        const whatsappMessage = `Hello ${fullName},\n\nYour registration at Tekisky Hospital is confirmed.\n\nToken Number: ${tokenNumber}\nDoctor: Dr. ${doctorUser.fullName}${specializationLabel}\nVisit: ${visitDateLabel}\n\nPlease arrive 10 minutes early and carry your ID proof.\n\nThank you,\nTekisky Hospital`;

        const whatsappResult = await sendWhatsAppMessage(mobileNumber, whatsappMessage);

        if (!whatsappResult.success) {
          console.warn('[WhatsApp] Notification not sent:', whatsappResult.reason || 'unknown reason');
        }
      } catch (whatsAppError) {
        console.error('[WhatsApp] Failed to send registration notification:', whatsAppError.message || whatsAppError);
      }
    } else {
      console.warn('[WhatsApp] Skipping notification because TWILIO credentials are not fully configured.');
    }

    res.status(201).json({
      success: true,
      data: patient,
      message: `Patient registered successfully. Token number: ${tokenNumber}`,
      remainingSlots: doctorUser.dailyPatientLimit - todayPatientCount - 1
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
export const getTodayPatients = async (req, res) => {
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
export const getAllPatients = async (req, res) => {
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
