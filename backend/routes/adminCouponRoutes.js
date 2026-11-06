const express = require('express');
const router = express.Router();

const { list, getOne, create, update, remove, toggleStatus } = require('../controllers/adminCouponController');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');

router.use(authMiddleware, requireRole('admin'));

router.get('/', list);
router.get('/:id', getOne);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);
router.patch('/:id/toggle', toggleStatus);

module.exports = router;
