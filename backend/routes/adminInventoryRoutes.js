const express = require('express');
const router = express.Router();

const { getStats, list, adjustStock, getHistory } = require('../controllers/adminInventoryController');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');

router.use(authMiddleware, requireRole('admin'));

router.get('/stats', getStats);
router.get('/history', getHistory);
router.get('/', list);
router.patch('/:id/adjust', adjustStock);

module.exports = router;
