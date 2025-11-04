import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  registerPatient,
  getTodayPatients,
  getAllPatients,
  cancelPatient,
  updatePatientPayment
} from '../controllers/patientController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

router.post('/register', registerPatient);
router.get('/today/:doctorId', getTodayPatients);
router.get('/', getAllPatients);
router.put('/:patientId/cancel', cancelPatient);
router.put('/:patientId/payment', updatePatientPayment);

export default router;
