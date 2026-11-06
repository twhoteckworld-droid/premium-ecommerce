const mongoose = require('mongoose');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const {
    createRazorpayOrder,
    verifyRazorpaySignature,
    PAYMENT_MODE
} = require('../config/razorpay');

// ============================================================
// CREATE PAYMENT ORDER
// Called from frontend after order created.
// Returns razorpayOrderId (or mock orderId) for checkout popup.
// ============================================================
exports.createPaymentOrder = async (req, res) => {
    try {
        const { orderId } = req.body;

        if (!orderId || !mongoose.isValidObjectId(orderId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid order ID'
            });
        }

        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Only Pending orders can be paid
        if (order.paymentStatus !== 'Pending') {
            return res.status(400).json({
                success: false,
                message: `Order payment already ${order.paymentStatus}`
            });
        }

        // Check if payment already exists for this order (prevent double-create)
        const existing = await Payment.findOne({
            order: order._id,
            status: 'Created'
        });

        if (existing) {
            return res.status(200).json({
                success: true,
                message: 'Payment order already exists',
                payment: {
                    razorpayOrderId: existing.razorpayOrderId,
                    amount: existing.amount,
                    currency: existing.currency
                },
                razorpayKeyId: PAYMENT_MODE === 'live'
                    ? process.env.RAZORPAY_KEY_ID
                    : null,
                mode: PAYMENT_MODE
            });
        }

        // Create Razorpay order
        const rpOrder = await createRazorpayOrder({
            amount: order.total,
            currency: 'INR',
            receipt: order.orderNumber
        });

        // Save Payment record
        const payment = await Payment.create({
            order: order._id,
            orderNumber: order.orderNumber,
            razorpayOrderId: rpOrder.id,
            amount: order.total,
            currency: 'INR',
            status: 'Created',
            mode: PAYMENT_MODE
        });

        res.status(201).json({
            success: true,
            payment: {
                razorpayOrderId: payment.razorpayOrderId,
                amount: payment.amount,
                currency: payment.currency
            },
            razorpayKeyId: PAYMENT_MODE === 'live'
                ? process.env.RAZORPAY_KEY_ID
                : null,
            mode: PAYMENT_MODE
        });

    } catch (error) {
        console.error('Create payment order error:', error);
        res.status(500).json({
            success: false,
            message: 'Unable to create payment order'
        });
    }
};


// ============================================================
// VERIFY PAYMENT
// Called from frontend after checkout success.
// Verifies signature, updates Payment + Order.
// ============================================================
exports.verifyPayment = async (req, res) => {
    try {
        const {
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature
        } = req.body;

        if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
            return res.status(400).json({
                success: false,
                message: 'Missing payment verification fields'
            });
        }

        const payment = await Payment.findOne({ razorpayOrderId });

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment record not found'
            });
        }

        // Idempotency: already verified → return success
        if (payment.status === 'Verified') {
            return res.status(200).json({
                success: true,
                message: 'Payment already verified',
                orderNumber: payment.orderNumber
            });
        }

        // If already Failed → reject
        if (payment.status === 'Failed') {
            return res.status(400).json({
                success: false,
                message: 'Payment marked as failed'
            });
        }

        // Verify signature (mock or live handled internally)
        const isValid = verifyRazorpaySignature({
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature
        });

        if (!isValid) {
            payment.status = 'Failed';
            payment.failureReason = 'Signature verification failed';
            payment.razorpayPaymentId = razorpayPaymentId;
            payment.razorpaySignature = razorpaySignature;
            await payment.save();

            return res.status(400).json({
                success: false,
                message: 'Payment verification failed (invalid signature)'
            });
        }

        // Signature valid → update Payment
        payment.status = 'Verified';
        payment.razorpayPaymentId = razorpayPaymentId;
        payment.razorpaySignature = razorpaySignature;
        payment.verifiedAt = new Date();
        await payment.save();

        // Update Order
        const order = await Order.findById(payment.order);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found for this payment'
            });
        }

        // Idempotency: if order already Paid, don't re-update
        if (order.paymentStatus === 'Paid') {
            return res.status(200).json({
                success: true,
                message: 'Order already paid',
                orderNumber: order.orderNumber
            });
        }

        order.paymentStatus = 'Paid';
        if (order.orderStatus === 'Payment Pending') {
            order.orderStatus = 'Confirmed';
        }
        await order.save();

        res.status(200).json({
            success: true,
            message: 'Payment verified successfully',
            orderNumber: order.orderNumber,
            orderStatus: order.orderStatus
        });

    } catch (error) {
        console.error('Verify payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Unable to verify payment'
        });
    }
};
