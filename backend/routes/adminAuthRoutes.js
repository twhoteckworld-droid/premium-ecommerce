const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const { login, me, changePassword } = require('../controllers/adminAuthController');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');

// Strict rate limit on login (5 attempts per 15 min per IP)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false
});

router.post('/login', loginLimiter, login);
router.get('/me', authMiddleware, requireRole('admin'), me);
router.post('/change-password', authMiddleware, requireRole('admin'), changePassword);

module.exports = router;
