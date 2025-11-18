import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  registerPatient,
  getTodayPatients,
  getAllPatients,
  cancelPatient,
  updatePatientPayment,
  getEmergencyPatients,
  getNextPatientId,
  searchPatients
} from '../controllers/patientController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

router.post('/register', registerPatient);
router.get('/next-id', getNextPatientId);
router.get('/search', searchPatients);
router.get('/today/:doctorId', getTodayPatients);
router.get('/emergency/:doctorId', getEmergencyPatients);
router.get('/', getAllPatients);
router.put('/:patientId/cancel', cancelPatient);
router.put('/:patientId/payment', updatePatientPayment);

export default router;
