import express from 'express';
import { protect } from '../middleware/auth.js';
import { login, seedMedical, getMe } from '../controllers/authController.js';

const router = express.Router();

router.post('/login', login);
router.post('/seed/medical', seedMedical);
router.get('/me', protect, getMe);

export default router;
