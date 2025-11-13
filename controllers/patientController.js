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
      gender,
      disease,
      doctor,
      fees,
      visitDate,
      visitTime,
      isRecheck,
      feeStatus,
      behaviorRating,
      paymentDate,
      paymentAmount,
      bloodPressure,
      sugarLevel
    } = req.body;

    // Validation
    if (!fullName || !mobileNumber || !address || !age || !gender || !disease || !doctor || !bloodPressure || sugarLevel === undefined || sugarLevel === null) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    const bpPattern = /^\d{2,3}(\/\d{2,3})?$/;
    if (!bpPattern.test(String(bloodPressure).trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid blood pressure reading (e.g. 120/80)'
      });
    }

    const numericSugar = Number(sugarLevel);
    if (!Number.isFinite(numericSugar) || numericSugar <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid sugar level in mg/dL'
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
    // For recheck-up visits, fees are always 0 and status is 'not_required'
    const finalFees = isRecheck ? 0 : (fees || 0)
    const finalFeeStatus = isRecheck ? 'not_required' : (feeStatus || 'pending')
    
    // Set payment date and amount if payment is completed
    const patientData = {
      fullName,
      mobileNumber,
      address,
      age,
      gender,
      disease,
      doctor,
      fees: finalFees,
      feeStatus: finalFeeStatus,
      isRecheck: isRecheck || false,
      tokenNumber,
      registrationDate,
      behaviorRating: behaviorRating || null,
      bloodPressure: String(bloodPressure).trim(),
      sugarLevel: numericSugar
    };

    // Add payment details if payment is completed
    if (finalFeeStatus === 'paid') {
      if (paymentDate) {
        patientData.paymentDate = new Date(paymentDate);
      } else {
        patientData.paymentDate = new Date();
      }
      if (paymentAmount) {
        patientData.paymentAmount = Number(paymentAmount);
      } else {
        patientData.paymentAmount = finalFees;
      }
    }
    
    const patient = await Patient.create(patientData);

    await patient.populate('doctor', 'fullName specialization qualification');

    const whatsappConfigured = Boolean((process.env.TWILIO_WHATSAPP_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID) && (process.env.TWILIO_WHATSAPP_AUTH_TOKEN || process.env.TWILIO_AUTH_TOKEN) && process.env.TWILIO_WHATSAPP_FROM);

    if (whatsappConfigured) {
      try {
        const visitDateLabel = new Date(registrationDate).toLocaleString('en-IN', {
          dateStyle: 'long',
          timeStyle: 'short'
        });

        const specializationLabel = doctorUser.specialization ? ` (${doctorUser.specialization})` : '';

        // Send WhatsApp to patient using the mobile number from the registration form
        console.log('[WhatsApp] Preparing to send patient notification...');
        console.log('[WhatsApp] Patient mobile number from form:', mobileNumber);
        
        const whatsappMessage = `Hello ${fullName},\n\nYour registration at Tekisky Hospital is confirmed.\n\nToken Number: ${tokenNumber}\nDoctor: Dr. ${doctorUser.fullName}${specializationLabel}\nVisit: ${visitDateLabel}\n\nPlease arrive 10 minutes early and carry your ID proof.\n\nThank you,\nTekisky Hospital`;

        console.log('[WhatsApp] Sending confirmation message to patient mobile number:', mobileNumber);
        const whatsappResult = await sendWhatsAppMessage(mobileNumber, whatsappMessage);

        if (!whatsappResult.success) {
          console.error('[WhatsApp] ❌ Patient notification FAILED');
          console.error('[WhatsApp] Patient mobile number used:', mobileNumber);
          console.error('[WhatsApp] Reason:', whatsappResult.reason || 'unknown reason');
          console.error('[WhatsApp] Error details:', whatsappResult.error);
        } else {
          console.log('[WhatsApp] ✅ Patient notification sent successfully');
          console.log('[WhatsApp] Message sent to:', mobileNumber);
          console.log('[WhatsApp] Message SID:', whatsappResult.sid);
          console.log('[WhatsApp] Status:', whatsappResult.status);
        }

        // Send WhatsApp notification to admin/owner about new patient registration
        const adminPhoneNumber = process.env.ADMIN_NOTIFICATION_PHONE || process.env.OWNER_PHONE;
        console.log('[WhatsApp] Checking admin notification config...');
        console.log('[WhatsApp] ADMIN_NOTIFICATION_PHONE:', process.env.ADMIN_NOTIFICATION_PHONE);
        console.log('[WhatsApp] OWNER_PHONE:', process.env.OWNER_PHONE);
        console.log('[WhatsApp] Resolved adminPhoneNumber:', adminPhoneNumber);
        
        if (adminPhoneNumber) {
          try {
            const adminMessage = `📋 New Patient Registration\n\nPatient: ${fullName}\nMobile: ${mobileNumber}\nAge: ${age} years\nDisease: ${disease}\n\nToken Number: ${tokenNumber}\nDoctor: Dr. ${doctorUser.fullName}${specializationLabel}\nVisit: ${visitDateLabel}\nAddress: ${address}\n\nTekisky Hospital OPD`;

            console.log('[WhatsApp] Attempting to send admin notification to:', adminPhoneNumber);
            const adminWhatsappResult = await sendWhatsAppMessage(adminPhoneNumber, adminMessage);

            if (!adminWhatsappResult.success) {
              console.error('[WhatsApp] ❌ Admin notification FAILED');
              console.error('[WhatsApp] Reason:', adminWhatsappResult.reason);
              console.error('[WhatsApp] Error details:', adminWhatsappResult.error);
            } else {
              console.log('[WhatsApp] ✅ Admin notification sent successfully');
              console.log('[WhatsApp] Message SID:', adminWhatsappResult.sid);
              console.log('[WhatsApp] Status:', adminWhatsappResult.status);
            }
          } catch (adminWhatsAppError) {
            console.error('[WhatsApp] ❌ Exception while sending admin notification:');
            console.error('[WhatsApp] Error:', adminWhatsAppError.message || adminWhatsAppError);
            console.error('[WhatsApp] Stack:', adminWhatsAppError.stack);
          }
        } else {
          console.warn('[WhatsApp] ⚠️ ADMIN_NOTIFICATION_PHONE or OWNER_PHONE not configured. Skipping admin notification.');
          console.warn('[WhatsApp] To receive notifications, add ADMIN_NOTIFICATION_PHONE=+91xxxxxxxxxx to your .env file');
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
      .populate('doctor', 'fullName specialization qualification profileImage')
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
      .populate('doctor', 'fullName specialization qualification fees profileImage')
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

// @desc    Update patient payment status
// @route   PUT /api/patient/:patientId/payment
// @access  Private/Doctor
export const updatePatientPayment = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { paymentAmount } = req.body;

    const patient = await Patient.findById(patientId);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    if (patient.isRecheck) {
      return res.status(400).json({
        success: false,
        message: 'Recheck-up patients do not require payment'
      });
    }

    if (patient.feeStatus === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Patient payment is already marked as paid'
      });
    }

    // Update payment status
    patient.feeStatus = 'paid';
    patient.paymentDate = new Date();
    if (paymentAmount) {
      patient.paymentAmount = Number(paymentAmount);
    } else {
      // Use the consultation fee if payment amount not provided
      patient.paymentAmount = patient.fees || 0;
    }

    await patient.save();

    await patient.populate('doctor', 'fullName specialization qualification');

    res.status(200).json({
      success: true,
      message: 'Payment status updated successfully',
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

// @desc    Cancel a patient
// @route   PUT /api/patient/:patientId/cancel
// @access  Private
export const cancelPatient = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { cancellationReason } = req.body;

    const patient = await Patient.findById(patientId);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    if (patient.isCancelled) {
      return res.status(400).json({
        success: false,
        message: 'Patient is already cancelled'
      });
    }

    patient.isCancelled = true;
    patient.status = 'cancelled';
    patient.cancelledAt = new Date();
    if (cancellationReason) {
      patient.cancellationReason = cancellationReason;
    }

    await patient.save();

    res.status(200).json({
      success: true,
      message: 'Patient cancelled successfully',
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
