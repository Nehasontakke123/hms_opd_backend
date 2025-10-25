const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createPrescription,
  getPatientById
} = require('../controllers/prescriptionController');

// All routes require authentication
router.use(protect);

router.put('/:patientId', createPrescription);
router.get('/patient/:patientId', getPatientById);

module.exports = router;
