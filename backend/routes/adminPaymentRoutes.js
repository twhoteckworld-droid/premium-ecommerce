const express = require('express');
const router = express.Router();

const { getStats, list, getOne } = require('../controllers/adminPaymentController');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');

router.use(authMiddleware, requireRole('admin'));

router.get('/stats', getStats);
router.get('/', list);
router.get('/:id', getOne);

module.exports = router;
