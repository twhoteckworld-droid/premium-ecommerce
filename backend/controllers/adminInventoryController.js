const mongoose = require('mongoose');
const Product = require('../models/Product');
const StockHistory = require('../models/StockHistory');

const LOW_STOCK_THRESHOLD = 5;

// ============ GET STATS ============
exports.getStats = async (req, res) => {
    try {
        const [total, lowStock, outOfStock] = await Promise.all([
            Product.countDocuments({ status: 'active' }),
            Product.countDocuments({ status: 'active', stock: { $gt: 0, $lt: LOW_STOCK_THRESHOLD } }),
            Product.countDocuments({ status: 'active', stock: 0 })
        ]);

        // Total inventory value (salePrice * stock)
        const valueAgg = await Product.aggregate([
            { $match: { status: 'active' } },
            { $group: { _id: null, total: { $sum: { $multiply: ['$salePrice', '$stock'] } } } }
        ]);
        const totalValue = valueAgg[0]?.total || 0;

        res.status(200).json({
            success: true,
            stats: {
                total,
                lowStock,
                outOfStock,
                totalValue,
                threshold: LOW_STOCK_THRESHOLD
            }
        });
    } catch (error) {
        console.error('Inventory stats error:', error);
        res.status(500).json({ success: false, message: 'Unable to load stats' });
    }
};

// ============ LIST INVENTORY ============
exports.list = async (req, res) => {
    try {
        const { page = 1, limit = 20, search, filter } = req.query;
        const query = { status: 'active' };

        if (search && typeof search === 'string') {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { sku: { $regex: search, $options: 'i' } }
            ];
        }

        if (filter === 'low') {
            query.stock = { $gt: 0, $lt: LOW_STOCK_THRESHOLD };
        } else if (filter === 'out') {
            query.stock = 0;
        } else if (filter === 'in') {
            query.stock = { $gte: LOW_STOCK_THRESHOLD };
        }

        const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
        const safePage = Math.max(Number(page) || 1, 1);

        const [products, total] = await Promise.all([
            Product.find(query)
                .select('name sku stock salePrice originalPrice images category status')
                .populate('category', 'name')
                .sort({ stock: 1, name: 1 })
                .limit(safeLimit)
                .skip((safePage - 1) * safeLimit)
                .lean(),
            Product.countDocuments(query)
        ]);

        res.status(200).json({ success: true, total, page: safePage, limit: safeLimit, products });
    } catch (error) {
        console.error('Inventory list error:', error);
        res.status(500).json({ success: false, message: 'Unable to load inventory' });
    }
};

// ============ ADJUST STOCK ============
exports.adjustStock = async (req, res) => {
    try {
        const { id } = req.params;
        const { change, reason, note } = req.body;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: 'Invalid product ID' });
        }

        const changeNum = Number(change);
        if (!Number.isInteger(changeNum) || changeNum === 0) {
            return res.status(400).json({ success: false, message: 'Change must be a non-zero integer' });
        }

        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        const newStock = product.stock + changeNum;
        if (newStock < 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot reduce by ${Math.abs(changeNum)}. Current stock: ${product.stock}`
            });
        }

        const previousStock = product.stock;
        product.stock = newStock;
        await product.save();

        // Log history
        await StockHistory.create({
            product: product._id,
            productName: product.name,
            change: changeNum,
            previousStock,
            newStock,
            reason: reason || 'manual_adjust',
            note: (note || '').trim(),
            performedBy: req.user?._id
        });

        res.status(200).json({
            success: true,
            message: 'Stock adjusted',
            product: { _id: product._id, name: product.name, stock: newStock, previousStock }
        });
    } catch (error) {
        console.error('Adjust stock error:', error);
        res.status(500).json({ success: false, message: 'Unable to adjust stock' });
    }
};

// ============ GET STOCK HISTORY ============
exports.getHistory = async (req, res) => {
    try {
        const { productId } = req.query;
        const filter = {};
        if (productId && mongoose.isValidObjectId(productId)) {
            filter.product = productId;
        }

        const history = await StockHistory.find(filter)
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        res.status(200).json({ success: true, history });
    } catch (error) {
        console.error('Stock history error:', error);
        res.status(500).json({ success: false, message: 'Unable to load history' });
    }
};
