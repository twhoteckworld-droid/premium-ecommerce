const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const Order = require('../models/Order');

// ============================================================
// GET /api/admin/payments/stats
// ============================================================
exports.getStats = async (req, res) => {
    try {
        const [total, verified, created, failed] = await Promise.all([
            Payment.countDocuments(),
            Payment.countDocuments({ status: 'Verified' }),
            Payment.countDocuments({ status: 'Created' }),
            Payment.countDocuments({ status: 'Failed' })
        ]);

        // Sum of verified payments
        const verifiedSum = await Payment.aggregate([
            { $match: { status: 'Verified' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const totalCollected = verifiedSum[0]?.total || 0;

        // Refunded count from orders (paymentStatus: Refunded)
        const refundedCount = await Order.countDocuments({ paymentStatus: 'Refunded' });

        res.status(200).json({
            success: true,
            stats: {
                total,
                successful: verified,
                pending: created,
                failed,
                refunded: refundedCount,
                totalCollected
            }
        });
    } catch (error) {
        console.error('Payment stats error:', error);
        res.status(500).json({ success: false, message: 'Unable to load stats' });
    }
};

// ============================================================
// GET /api/admin/payments
// Query: page, limit, status, search, from, to
// ============================================================
exports.list = async (req, res) => {
    try {
        const { page = 1, limit = 20, status, search, from, to } = req.query;
        const filter = {};

        if (status && ['Created', 'Verified', 'Failed'].includes(status)) {
            filter.status = status;
        }

        if (from || to) {
            filter.createdAt = {};
            if (from) filter.createdAt.$gte = new Date(from);
            if (to) filter.createdAt.$lte = new Date(to);
        }

        if (search && typeof search === 'string') {
            filter.$or = [
                { razorpayOrderId: { $regex: search, $options: 'i' } },
                { razorpayPaymentId: { $regex: search, $options: 'i' } },
                { orderNumber: { $regex: search, $options: 'i' } }
            ];
        }

        const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
        const safePage = Math.max(Number(page) || 1, 1);

        const [payments, total] = await Promise.all([
            Payment.find(filter)
                .sort({ createdAt: -1 })
                .limit(safeLimit)
                .skip((safePage - 1) * safeLimit)
                .lean(),
            Payment.countDocuments(filter)
        ]);

        res.status(200).json({ success: true, total, page: safePage, limit: safeLimit, payments });
    } catch (error) {
        console.error('List payments error:', error);
        res.status(500).json({ success: false, message: 'Unable to load payments' });
    }
};

// ============================================================
// GET /api/admin/payments/:id
// ============================================================
exports.getOne = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: 'Invalid ID' });
        }

        const payment = await Payment.findById(id).lean();
        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }

        // Linked order
        const order = await Order.findById(payment.order)
            .select('orderNumber customerDetails total orderStatus paymentStatus items')
            .lean();

        res.status(200).json({ success: true, payment, order });
    } catch (error) {
        console.error('Get payment error:', error);
        res.status(500).json({ success: false, message: 'Unable to load payment' });
    }
};
