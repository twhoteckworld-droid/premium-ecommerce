const express = require('express');
const router = express.Router();

const {
    list, getOne, create, update, remove, toggleStatus
} = require('../controllers/adminCategoryController');

const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const { uploadCategoryImage } = require('../middleware/categoryUploadMiddleware');

router.use(authMiddleware, requireRole('admin'));

router.get('/', list);
router.get('/:id', getOne);
router.post('/', uploadCategoryImage, create);
router.put('/:id', uploadCategoryImage, update);
router.delete('/:id', remove);
router.patch('/:id/toggle', toggleStatus);

module.exports = router;
