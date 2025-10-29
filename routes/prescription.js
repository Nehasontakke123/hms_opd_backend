import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  createPrescription,
  getPatientById
} from '../controllers/prescriptionController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

router.put('/:patientId', createPrescription);
router.get('/patient/:patientId', getPatientById);

export default router;
