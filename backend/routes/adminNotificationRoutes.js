const express = require('express');
const router = express.Router();

const { list, unreadCount, markRead, markAllRead, remove, clearAll } = require('../controllers/adminNotificationController');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');

router.use(authMiddleware, requireRole('admin'));

router.get('/', list);
router.get('/unread-count', unreadCount);
router.patch('/:id/read', markRead);
router.patch('/read-all', markAllRead);
router.delete('/clear-all', clearAll);
router.delete('/:id', remove);

module.exports = router;
