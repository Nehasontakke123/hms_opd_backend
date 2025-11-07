import Razorpay from 'razorpay';
import crypto from 'crypto';

// Lazy initialize Razorpay instance (only when needed)
let razorpay = null;

const getRazorpayInstance = () => {
  if (!razorpay) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    
    if (!keyId || !keySecret) {
      throw new Error('Razorpay credentials not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in environment variables.');
    }
    
    razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    });
  }
  return razorpay;
};

// @desc    Create Razorpay order
// @route   POST /api/payment/create-order
// @access  Private/Receptionist
export const createOrder = async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount'
      });
    }

    // Get Razorpay instance
    const razorpayInstance = getRazorpayInstance();
    
    // Create order in Razorpay
    const options = {
      amount: amount * 100, // Convert to paise (Razorpay expects amount in smallest currency unit)
      currency: currency,
      receipt: receipt || `receipt_${Date.now()}`,
      payment_capture: 1 // Auto capture payment
    };

    const order = await razorpayInstance.orders.create(options);

    res.status(200).json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID
      }
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment order',
      error: error.message
    });
  }
};

// @desc    Create Razorpay QR code for payment
// @route   POST /api/payment/create-qr
// @access  Private/Receptionist
export const createQRCode = async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt, description } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount'
      });
    }

    // Get Razorpay instance
    const razorpayInstance = getRazorpayInstance();
    
    // Create QR code in Razorpay
    const qrOptions = {
      type: 'upi_qr',
      name: description || `Payment - ${receipt || Date.now()}`,
      usage: 'single_use',
      fixed_amount: true,
      payment_amount: amount * 100, // Convert to paise
      description: description || `Payment for ${receipt || 'consultation'}`
    };

    const qrCode = await razorpayInstance.qrCode.create(qrOptions);

    res.status(200).json({
      success: true,
      data: {
        qrId: qrCode.id,
        qrImageUrl: qrCode.image_url,
        qrShortUrl: qrCode.short_url,
        amount: qrCode.payment_amount / 100, // Convert back to rupees
        currency: currency,
        status: qrCode.status
      }
    });
  } catch (error) {
    console.error('Error creating QR code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create QR code',
      error: error.message
    });
  }
};

// @desc    Check QR code payment status
// @route   GET /api/payment/qr-status/:qrId
// @access  Private/Receptionist
export const checkQRStatus = async (req, res) => {
  try {
    const { qrId } = req.params;

    if (!qrId) {
      return res.status(400).json({
        success: false,
        message: 'QR code ID is required'
      });
    }

    // Get Razorpay instance
    const razorpayInstance = getRazorpayInstance();
    
    // Fetch QR code details
    const qrCode = await razorpayInstance.qrCode.fetch(qrId);

    res.status(200).json({
      success: true,
      data: {
        qrId: qrCode.id,
        status: qrCode.status,
        payments: qrCode.payments || [],
        amount: qrCode.payment_amount ? qrCode.payment_amount / 100 : null
      }
    });
  } catch (error) {
    console.error('Error checking QR status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check QR code status',
      error: error.message
    });
  }
};

// @desc    Verify Razorpay payment
// @route   POST /api/payment/verify
// @access  Private/Receptionist
export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing payment verification details'
      });
    }

    // Create signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest('hex');

    // Verify signature
    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed - Invalid signature'
      });
    }

    // Payment verified successfully
    res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id
      }
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed',
      error: error.message
    });
  }
};

