const Product = require('../models/Product');

// GET ALL PRODUCTS + SEARCH + FILTER
exports.getProducts = async (req, res) => {
    try {
        const {
            search,
            category,
            featured,
            page = 1,
            limit = 12
        } = req.query;

        const filter = { status: 'active' };

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        if (category) {
            filter.category = category;
        }

        if (featured === 'true') {
            filter.isFeatured = true;
        }

        const products = await Product.find(filter)
            .populate('category', 'name slug')
            .sort({ createdAt: -1 })
            .limit(Math.min(Number(limit) || 12, 50))
            .skip((Math.max(Number(page) || 1, 1) - 1) * Math.min(Number(limit) || 12, 50));

        const total = await Product.countDocuments(filter);

        res.status(200).json({
            success: true,
            total,
            page: Number(page),
            products
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Unable to fetch products'
        });
    }
};


// GET SINGLE PRODUCT
exports.getProductBySlug = async (req, res) => {
    try {
        const product = await Product.findOne({
            slug: req.params.slug,
            status: 'active'
        }).populate('category', 'name slug');

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.status(200).json({
            success: true,
            product
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Unable to fetch product'
        });
    }
};

