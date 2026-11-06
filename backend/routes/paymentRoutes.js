const express = require('express');
const router = express.Router();
const { createPaymentOrder, verifyPayment } = require('../controllers/paymentController');

// Create Razorpay order (from existing NovaStore order)
router.post('/create-order', createPaymentOrder);

// Verify payment after checkout
router.post('/verify', verifyPayment);

module.exports = router;
