const express = require('express');
const router = express.Router();

const { getStats, list, getOne, approve, reject, remove } = require('../controllers/adminReviewController');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');

router.use(authMiddleware, requireRole('admin'));

router.get('/stats', getStats);
router.get('/', list);
router.get('/:id', getOne);
router.patch('/:id/approve', approve);
router.patch('/:id/reject', reject);
router.delete('/:id', remove);

module.exports = router;
