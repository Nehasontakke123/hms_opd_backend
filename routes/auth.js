import express from 'express';
import { login, seedMedical } from '../controllers/authController.js';

const router = express.Router();

router.post('/login', login);
router.post('/seed/medical', seedMedical);

export default router;
