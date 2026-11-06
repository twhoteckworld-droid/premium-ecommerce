const express = require('express');
const router = express.Router();

const {
    getProducts,
    getProductBySlug
} = require('../controllers/productController');

// All products
router.get('/', getProducts);

// Single product
router.get('/:slug', getProductBySlug);

module.exports = router;
