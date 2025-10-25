const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  registerPatient,
  getTodayPatients,
  getAllPatients
} = require('../controllers/patientController');

// All routes require authentication
router.use(protect);

router.post('/register', registerPatient);
router.get('/today/:doctorId', getTodayPatients);
router.get('/', getAllPatients);

module.exports = router;
