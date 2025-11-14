import Appointment from '../models/Appointment.js';
import User from '../models/User.js';
import { sendSMS } from '../utils/sendSMS.js';

// Utility function to get day name from date
const getDayName = (date) => {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[date.getDay()];
};

// Check if a date is available for a doctor based on weekly schedule
const isDateAvailable = (date, doctor) => {
  if (!doctor || !date) return true; // Default to available if no doctor
  
  const schedule = doctor.weeklySchedule || {};
  const dayName = getDayName(date);
  
  // If schedule exists, check if the day is enabled
  // Default to true if schedule doesn't exist (backward compatibility)
  return schedule[dayName] !== false;
};

// Get available time slots for a doctor based on visiting hours
const getAvailableTimeSlots = (doctor, selectedDate) => {
  if (!doctor || !selectedDate) return [];
  
  const visitingHours = doctor.visitingHours || {};
  const slots = [];
  
  // Check if date is available
  if (!isDateAvailable(selectedDate, doctor)) {
    return [];
  }
  
  // Generate time slots for each enabled visiting hour period
  const periods = ['morning', 'afternoon', 'evening'];
  
  periods.forEach(period => {
    const periodHours = visitingHours[period];
    if (periodHours?.enabled && periodHours.start && periodHours.end) {
      const start = periodHours.start.split(':');
      const end = periodHours.end.split(':');
      const startHour = parseInt(start[0], 10);
      const startMin = parseInt(start[1] || '0', 10);
      const endHour = parseInt(end[0], 10);
      const endMin = parseInt(end[1] || '0', 10);
      
      // Generate 30-minute slots
      let currentHour = startHour;
      let currentMin = startMin;
      
      while (
        currentHour < endHour || 
        (currentHour === endHour && currentMin < endMin)
      ) {
        const timeString = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
        slots.push(timeString);
        
        // Increment by 30 minutes
        currentMin += 30;
        if (currentMin >= 60) {
          currentMin = 0;
          currentHour += 1;
        }
      }
    }
  });
  
  return slots.sort();
};

// Check if a time is available for a doctor
const isTimeAvailable = (timeString, doctor, selectedDate) => {
  if (!doctor || !timeString || !selectedDate) return true;
  
  // First check if date is available
  if (!isDateAvailable(selectedDate, doctor)) {
    return false;
  }
  
  const availableSlots = getAvailableTimeSlots(doctor, selectedDate);
  
  // If no slots defined, allow any time (backward compatibility)
  if (availableSlots.length === 0) {
    return true;
  }
  
  // Check if the time matches any available slot (within 30 min window)
  const [hours, minutes] = timeString.split(':').map(Number);
  const timeInMinutes = hours * 60 + minutes;
  
  return availableSlots.some(slot => {
    const [slotHours, slotMinutes] = slot.split(':').map(Number);
    const slotInMinutes = slotHours * 60 + slotMinutes;
    // Allow times within 30 minutes of a slot
    return Math.abs(timeInMinutes - slotInMinutes) <= 30;
  });
};

// @desc    Create new appointment
// @route   POST /api/appointment
// @access  Private/Receptionist/Admin
export const createAppointment = async (req, res) => {
  try {
    const {
      patientName,
      mobileNumber,
      email,
      appointmentDate,
      appointmentTime,
      doctor,
      reason,
      notes,
      skipSms
    } = req.body;

    // Validation
    if (!patientName || !mobileNumber || !appointmentDate || !appointmentTime || !doctor) {
      return res.status(400).json({
        success: false,
        message: 'Please provide patient name, mobile number, appointment date, time, and doctor'
      });
    }

    // Check if doctor exists
    const doctorUser = await User.findById(doctor);
    if (!doctorUser || doctorUser.role !== 'doctor') {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    // Validate doctor availability
    const appointmentDateObj = new Date(appointmentDate);
    if (!isDateAvailable(appointmentDateObj, doctorUser)) {
      return res.status(400).json({
        success: false,
        message: 'Selected date is not available for this doctor. Please choose another date.'
      });
    }
    
    if (!isTimeAvailable(appointmentTime, doctorUser, appointmentDateObj)) {
      return res.status(400).json({
        success: false,
        message: 'Selected time is not available for this doctor on the chosen date. Please select an available time slot.'
      });
    }

    // Create appointment
    const appointment = await Appointment.create({
      patientName,
      mobileNumber,
      email,
      appointmentDate: new Date(appointmentDate),
      appointmentTime,
      doctor,
      reason,
      notes,
      status: 'scheduled'
    });

    await appointment.populate('doctor', 'fullName specialization');

    if (skipSms === true) {
      return res.status(201).json({
        success: true,
        message: 'Appointment scheduled successfully.',
        data: appointment,
        smsSent: false,
        smsSkipped: true
      });
    }

    // Send SMS to patient
    try {
      const appointmentDateFormatted = new Date(appointmentDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const smsMessage = `Hello ${patientName}, your appointment with Dr. ${doctorUser.fullName}${doctorUser.specialization ? ` (${doctorUser.specialization})` : ''} is scheduled for ${appointmentDateFormatted} at ${appointmentTime}. Please arrive 15 minutes early. - Tekisky Hospital`;

      console.log('📱 Attempting to send SMS...');
      const smsResult = await sendSMS(mobileNumber, smsMessage);
      
      console.log('📱 SMS Result:', JSON.stringify(smsResult, null, 2));
      
      // Check if SMS was actually sent via real provider (not mock)
      const isRealSMS = smsResult.success && 
                       smsResult.provider && 
                       !smsResult.provider.includes('mock') && 
                       smsResult.provider !== 'mock';
      
      if (isRealSMS) {
        appointment.smsSent = true;
        appointment.smsSentAt = new Date();
        await appointment.save();
        console.log('✅ SMS marked as sent in database');
        
        res.status(201).json({
          success: true,
          message: 'Appointment scheduled successfully and SMS sent to patient',
          data: appointment,
          smsSent: true
        });
      } else {
        console.warn('⚠️ SMS was not actually sent (mock mode or failed):', smsResult);
        
        // Check if it's mock mode
        if (smsResult.provider === 'mock' || smsResult.provider?.includes('mock')) {
          res.status(201).json({
            success: true,
            message: 'Appointment scheduled successfully! ✅ (SMS will be enabled after adding TextLocal API key - see backend/GET_TEXTLOCAL_API_KEY.md)',
            data: appointment,
            smsSent: false,
            smsNote: 'Appointment saved. SMS setup: Get free API key from textlocal.in/signup (5 min setup)'
          });
        } else {
          res.status(201).json({
            success: true,
            message: 'Appointment scheduled successfully, but SMS sending failed',
            data: appointment,
            smsSent: false,
            smsError: 'SMS could not be sent. Please check server logs and SMS provider configuration.'
          });
        }
      }
    } catch (smsError) {
      console.error('❌ Failed to send SMS:', smsError);
      console.error('Error details:', {
        message: smsError.message,
        stack: smsError.stack,
        response: smsError.response?.data
      });
      
      // Appointment is created but SMS failed
      const errorMessage = smsError.message || 'SMS sending failed';
      
      res.status(201).json({
        success: true,
        message: 'Appointment scheduled successfully, but SMS sending failed',
        data: appointment,
        smsSent: false,
        smsError: process.env.NODE_ENV === 'development' ? errorMessage : 'SMS sending failed. Please check server logs for details.'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get all appointments
// @route   GET /api/appointment
// @access  Private
export const getAllAppointments = async (req, res) => {
  try {
    const { doctor, status, date } = req.query;

    // Build query
    const query = {};
    if (doctor) query.doctor = doctor;
    if (status) query.status = status;
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      
      query.appointmentDate = {
        $gte: startDate,
        $lt: endDate
      };
    }

    const appointments = await Appointment.find(query)
      .populate('doctor', 'fullName specialization')
      .sort({ appointmentDate: 1, appointmentTime: 1 });

    res.status(200).json({
      success: true,
      count: appointments.length,
      data: appointments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get appointment by ID
// @route   GET /api/appointment/:id
// @access  Private
export const getAppointmentById = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('doctor', 'fullName specialization email mobileNumber');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    res.status(200).json({
      success: true,
      data: appointment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update appointment
// @route   PUT /api/appointment/:id
// @access  Private/Receptionist/Admin
export const updateAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    const { patientName, mobileNumber, email, appointmentDate, appointmentTime, doctor, reason, status, notes, cancellationReason, refundAmount, refundStatus, refundNotes, cancelledAt } = req.body;

    // If doctor, date, or time is being updated, validate availability
    let doctorUser = appointment.doctor;
    if (doctor && doctor !== appointment.doctor.toString()) {
      doctorUser = await User.findById(doctor);
      if (!doctorUser || doctorUser.role !== 'doctor') {
        return res.status(404).json({
          success: false,
          message: 'Doctor not found'
        });
      }
    } else if (appointment.doctor) {
      doctorUser = await User.findById(appointment.doctor);
    }

    // Validate availability if date or time is being changed
    if (doctorUser && (appointmentDate || appointmentTime)) {
      const dateToCheck = appointmentDate ? new Date(appointmentDate) : appointment.appointmentDate;
      const timeToCheck = appointmentTime || appointment.appointmentTime;
      
      if (!isDateAvailable(dateToCheck, doctorUser)) {
        return res.status(400).json({
          success: false,
          message: 'Selected date is not available for this doctor. Please choose another date.'
        });
      }
      
      if (!isTimeAvailable(timeToCheck, doctorUser, dateToCheck)) {
        return res.status(400).json({
          success: false,
          message: 'Selected time is not available for this doctor on the chosen date. Please select an available time slot.'
        });
      }
    }

    // Update fields
    if (patientName) appointment.patientName = patientName;
    if (mobileNumber) appointment.mobileNumber = mobileNumber;
    if (email !== undefined) appointment.email = email;
    if (appointmentDate) appointment.appointmentDate = new Date(appointmentDate);
    if (appointmentTime) appointment.appointmentTime = appointmentTime;
    if (doctor) appointment.doctor = doctor;
    if (reason !== undefined) appointment.reason = reason;
    if (status) appointment.status = status;
    if (notes !== undefined) appointment.notes = notes;
    if (cancellationReason !== undefined) appointment.cancellationReason = cancellationReason;
    if (cancelledAt) appointment.cancelledAt = new Date(cancelledAt);
    if (refundAmount !== undefined) appointment.refundAmount = Number(refundAmount) || 0;
    if (refundStatus) appointment.refundStatus = refundStatus;
    if (refundNotes !== undefined) appointment.refundNotes = refundNotes;

    await appointment.save();
    await appointment.populate('doctor', 'fullName specialization');

    res.status(200).json({
      success: true,
      data: appointment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Delete appointment
// @route   DELETE /api/appointment/:id
// @access  Private/Admin
export const deleteAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    await appointment.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Appointment deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Cancel appointment
// @route   POST /api/appointment/:id/cancel
// @access  Private/Admin/Receptionist
export const cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { cancellationReason, refundAmount, refundStatus, refundNotes, notifyPatient } = req.body;

    const appointment = await Appointment.findById(id).populate('doctor', 'fullName specialization');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    if (appointment.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Appointment is already cancelled'
      });
    }

    if (appointment.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Completed appointments cannot be cancelled'
      });
    }

    appointment.status = 'cancelled';
    appointment.cancellationReason = cancellationReason || 'Cancelled by hospital';
    appointment.cancelledAt = new Date();
    if (req.user?.id) {
      appointment.cancelledBy = req.user.id;
    }

    const refundValue = refundAmount !== undefined && refundAmount !== null
      ? Number(refundAmount)
      : appointment.refundAmount || 0;

    appointment.refundAmount = isNaN(refundValue) ? 0 : refundValue;
    appointment.refundStatus = refundStatus || (appointment.refundAmount > 0 ? 'pending' : 'not_applicable');
    if (refundNotes !== undefined) {
      appointment.refundNotes = refundNotes;
    }

    await appointment.save();

    let smsResult = null;
    if (notifyPatient !== false) {
      try {
        const appointmentDateFormatted = new Date(appointment.appointmentDate).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        let message = `Hello ${appointment.patientName}, your appointment with Dr. ${appointment.doctor?.fullName || ''} on ${appointmentDateFormatted} at ${appointment.appointmentTime} has been cancelled.`;
        if (appointment.cancellationReason) {
          message += ` Reason: ${appointment.cancellationReason}.`;
        }
        if (appointment.refundAmount > 0) {
          message += ` Refund of ₹${appointment.refundAmount} is ${appointment.refundStatus === 'processed' ? 'completed' : 'in process'}.`;
        }

        smsResult = await sendSMS(appointment.mobileNumber, message);
      } catch (smsError) {
        console.error('Failed to send cancellation SMS:', smsError);
      }
    }

    await appointment.populate('doctor', 'fullName specialization');

    res.status(200).json({
      success: true,
      message: 'Appointment cancelled successfully',
      data: appointment,
      smsResult
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to cancel appointment',
      error: error.message
    });
  }
};

// @desc    Resend SMS for appointment
// @route   POST /api/appointment/:id/resend-sms
// @access  Private/Receptionist/Admin
export const resendSMS = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('doctor', 'fullName specialization');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    const appointmentDateFormatted = new Date(appointment.appointmentDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const smsMessage = `Hello ${appointment.patientName}, your appointment with Dr. ${appointment.doctor.fullName}${appointment.doctor.specialization ? ` (${appointment.doctor.specialization})` : ''} is scheduled for ${appointmentDateFormatted} at ${appointment.appointmentTime}. Please arrive 15 minutes early. - Tekisky Hospital`;

    const smsResult = await sendSMS(appointment.mobileNumber, smsMessage);

    appointment.smsSent = true;
    appointment.smsSentAt = new Date();
    await appointment.save();

    res.status(200).json({
      success: true,
      message: 'SMS sent successfully',
      data: appointment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send SMS',
      error: error.message
    });
  }
};

