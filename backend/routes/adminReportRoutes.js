const express = require('express');
const router = express.Router();

const { salesReport, productReport, customerReport, exportCSV } = require('../controllers/adminReportController');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');

router.use(authMiddleware, requireRole('admin'));

router.get('/sales', salesReport);
router.get('/products', productReport);
router.get('/customers', customerReport);
router.get('/export/:type', exportCSV);

module.exports = router;
