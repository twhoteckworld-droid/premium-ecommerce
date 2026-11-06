const express = require('express');
const router = express.Router();

const { get, update } = require('../controllers/adminSettingController');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');

router.use(authMiddleware, requireRole('admin'));

router.get('/', get);
router.put('/', update);

module.exports = router;
