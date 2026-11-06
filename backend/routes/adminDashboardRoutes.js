const express = require('express');
const router = express.Router();

const {
    getStats,
    getCharts,
    getRecent
} = require('../controllers/adminDashboardController');

const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');

// All routes require admin
router.use(authMiddleware, requireRole('admin'));

router.get('/stats', getStats);
router.get('/charts', getCharts);
router.get('/recent', getRecent);

module.exports = router;
