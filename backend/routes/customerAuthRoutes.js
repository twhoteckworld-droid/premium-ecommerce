const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const { register, login, myOrders, me } = require('../controllers/customerAuthController');
const authMiddleware = require('../middleware/authMiddleware');

// Rate limiter for login/register
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { success: false, message: 'Too many attempts. Try later.' }
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);

// Protected routes (customer must be logged in)
router.get('/me', authMiddleware, me);
router.get('/my-orders', authMiddleware, myOrders);

module.exports = router;
