import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  createPrescription,
  getPatientById,
  getMedicalHistory,
  generatePrescriptionPDF
} from '../controllers/prescriptionController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

router.put('/:patientId', createPrescription);
router.get('/patient/:patientId', getPatientById);
router.get('/medical-history', getMedicalHistory);
router.post('/generate', generatePrescriptionPDF);

export default router;
