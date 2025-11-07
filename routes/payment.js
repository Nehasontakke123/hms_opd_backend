import express from 'express';
import { protect } from '../middleware/auth.js';
import { createOrder, verifyPayment, createQRCode, checkQRStatus } from '../controllers/paymentController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Create Razorpay order
router.post('/create-order', createOrder);

// Create Razorpay QR code
router.post('/create-qr', createQRCode);

// Check QR code payment status
router.get('/qr-status/:qrId', checkQRStatus);

// Verify payment
router.post('/verify', verifyPayment);

export default router;

