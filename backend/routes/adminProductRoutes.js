const express = require('express');
const router = express.Router();

const {
    list, getOne, create, update, remove, toggleField
} = require('../controllers/adminProductController');

const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const { uploadProductImages } = require('../middleware/uploadMiddleware');

router.use(authMiddleware, requireRole('admin'));

router.get('/', list);
router.get('/:id', getOne);
router.post('/', uploadProductImages, create);
router.put('/:id', uploadProductImages, update);
router.delete('/:id', remove);
router.patch('/:id/toggle', toggleField);

module.exports = router;
