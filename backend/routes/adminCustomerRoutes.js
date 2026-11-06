const express = require('express');
const router = express.Router();

const { list, getOne } = require('../controllers/adminCustomerController');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');

router.use(authMiddleware, requireRole('admin'));

router.get('/', list);
router.get('/:id', getOne);

module.exports = router;
