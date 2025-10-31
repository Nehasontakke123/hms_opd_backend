import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  createAppointment,
  getAllAppointments,
  getAppointmentById,
  updateAppointment,
  deleteAppointment,
  resendSMS,
  cancelAppointment
} from '../controllers/appointmentController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Create appointment (receptionist, admin)
router.post('/', authorize('admin', 'receptionist'), createAppointment);

// Get all appointments (all authenticated users can view)
router.get('/', getAllAppointments);

// Cancel appointment (receptionist, admin)
router.post('/:id/cancel', authorize('admin', 'receptionist'), cancelAppointment);

// Resend SMS (receptionist, admin) - Must be before /:id to avoid route conflicts
router.post('/:id/resend-sms', authorize('admin', 'receptionist'), resendSMS);

// Get appointment by ID
router.get('/:id', getAppointmentById);

// Update appointment (receptionist, admin)
router.put('/:id', authorize('admin', 'receptionist'), updateAppointment);

// Delete appointment (admin only)
router.delete('/:id', authorize('admin'), deleteAppointment);

export default router;

