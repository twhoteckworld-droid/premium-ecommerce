const express = require('express');
const router = express.Router();

const {
    createOrder,
    getOrderById,
    getOrders,
    updateOrderStatus,
    cancelOrder
} = require('../controllers/orderController');

const authMiddleware = require('../middleware/authMiddleware');
const optionalAuth = require('../middleware/optionalAuthMiddleware');
const requireRole = require('../middleware/roleMiddleware');

// Public
router.post('/', createOrder);

// Single order: optional auth (admin via JWT gets access; others need phone last-4)
router.get('/:id', optionalAuth, getOrderById);

// Admin only (JWT)
router.get('/', authMiddleware, requireRole('admin'), getOrders);
router.patch('/:id/status', authMiddleware, requireRole('admin'), updateOrderStatus);
router.patch('/:id/cancel', authMiddleware, requireRole('admin'), cancelOrder);

module.exports = router;
