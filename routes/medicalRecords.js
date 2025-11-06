import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  getAllPrescriptions,
  getPrescriptionStats,
  getPrescriptionById
} from '../controllers/medicalRecordsController.js';

const router = express.Router();

// All routes require authentication and medical role
router.use(protect);
router.use(authorize('medical'));

router.get('/prescriptions', getAllPrescriptions);
router.get('/stats', getPrescriptionStats);
router.get('/prescription/:prescriptionId', getPrescriptionById);

export default router;

