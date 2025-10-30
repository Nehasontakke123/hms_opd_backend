import Appointment from '../models/Appointment.js';
import User from '../models/User.js';
import { sendSMS } from '../utils/sendSMS.js';

// @desc    Create new appointment
// @route   POST /api/appointment
// @access  Private/Receptionist/Admin
export const createAppointment = async (req, res) => {
  try {
    const { patientName, mobileNumber, email, appointmentDate, appointmentTime, doctor, reason, notes } = req.body;

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

    const { patientName, mobileNumber, email, appointmentDate, appointmentTime, doctor, reason, status, notes } = req.body;

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

