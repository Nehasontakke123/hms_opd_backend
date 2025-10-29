import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  registerPatient,
  getTodayPatients,
  getAllPatients
} from '../controllers/patientController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

router.post('/register', registerPatient);
router.get('/today/:doctorId', getTodayPatients);
router.get('/', getAllPatients);

export default router;
