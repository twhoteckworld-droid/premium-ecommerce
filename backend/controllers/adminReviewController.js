const mongoose = require('mongoose');
const Review = require('../models/Review');
const Product = require('../models/Product');

// ============ STATS ============
exports.getStats = async (req, res) => {
    try {
        const [total, pending, approved, rejected] = await Promise.all([
            Review.countDocuments(),
            Review.countDocuments({ status: 'pending' }),
            Review.countDocuments({ status: 'approved' }),
            Review.countDocuments({ status: 'rejected' })
        ]);

        // Average rating of approved
        const avgAgg = await Review.aggregate([
            { $match: { status: 'approved' } },
            { $group: { _id: null, avg: { $avg: '$rating' } } }
        ]);
        const avgRating = avgAgg[0]?.avg ? Math.round(avgAgg[0].avg * 10) / 10 : 0;

        res.status(200).json({
            success: true,
            stats: { total, pending, approved, rejected, avgRating }
        });
    } catch (error) {
        console.error('Review stats error:', error);
        res.status(500).json({ success: false, message: 'Unable to load stats' });
    }
};

// ============ LIST ============
exports.list = async (req, res) => {
    try {
        const { page = 1, limit = 20, status, search, productId } = req.query;
        const filter = {};

        if (status && ['pending', 'approved', 'rejected'].includes(status)) {
            filter.status = status;
        }
        if (productId && mongoose.isValidObjectId(productId)) {
            filter.product = productId;
        }
        if (search && typeof search === 'string') {
            filter.$or = [
                { customerName: { $regex: search, $options: 'i' } },
                { comment: { $regex: search, $options: 'i' } },
                { title: { $regex: search, $options: 'i' } }
            ];
        }

        const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
        const safePage = Math.max(Number(page) || 1, 1);

        const [reviews, total] = await Promise.all([
            Review.find(filter)
                .populate('product', 'name slug images')
                .sort({ createdAt: -1 })
                .limit(safeLimit)
                .skip((safePage - 1) * safeLimit)
                .lean(),
            Review.countDocuments(filter)
        ]);

        res.status(200).json({ success: true, total, page: safePage, limit: safeLimit, reviews });
    } catch (error) {
        console.error('List reviews error:', error);
        res.status(500).json({ success: false, message: 'Unable to load reviews' });
    }
};

// ============ GET ONE ============
exports.getOne = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });
        const review = await Review.findById(id).populate('product', 'name slug images').lean();
        if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
        res.status(200).json({ success: true, review });
    } catch (error) {
        console.error('Get review error:', error);
        res.status(500).json({ success: false, message: 'Unable to load review' });
    }
};

// ============ APPROVE ============
exports.approve = async (req, res) => {
    try {
        const { id } = req.params;
        const review = await Review.findById(id);
        if (!review) return res.status(404).json({ success: false, message: 'Review not found' });

        review.status = 'approved';
        review.rejectionReason = undefined;
        review.moderatedAt = new Date();
        review.moderatedBy = req.user?._id;
        await review.save();

        // Recalculate product rating (approved only)
        const avgAgg = await Review.aggregate([
            { $match: { product: review.product, status: 'approved' } },
            { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
        ]);
        const avg = avgAgg[0]?.avg || 0;
        const count = avgAgg[0]?.count || 0;
        await Product.updateOne({ _id: review.product }, { rating: Math.round(avg * 10) / 10, reviewCount: count });

        res.status(200).json({ success: true, message: 'Review approved', review });
    } catch (error) {
        console.error('Approve review error:', error);
        res.status(500).json({ success: false, message: 'Unable to approve' });
    }
};

// ============ REJECT ============
exports.reject = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const review = await Review.findById(id);
        if (!review) return res.status(404).json({ success: false, message: 'Review not found' });

        review.status = 'rejected';
        review.rejectionReason = (reason || '').trim() || 'Rejected by admin';
        review.moderatedAt = new Date();
        review.moderatedBy = req.user?._id;
        await review.save();

        // Recalculate product rating (in case previously approved)
        const avgAgg = await Review.aggregate([
            { $match: { product: review.product, status: 'approved' } },
            { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
        ]);
        const avg = avgAgg[0]?.avg || 0;
        const count = avgAgg[0]?.count || 0;
        await Product.updateOne({ _id: review.product }, { rating: Math.round(avg * 10) / 10, reviewCount: count });

        res.status(200).json({ success: true, message: 'Review rejected', review });
    } catch (error) {
        console.error('Reject review error:', error);
        res.status(500).json({ success: false, message: 'Unable to reject' });
    }
};

// ============ DELETE ============
exports.remove = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });
        const review = await Review.findById(id);
        if (!review) return res.status(404).json({ success: false, message: 'Review not found' });

        const productId = review.product;
        await review.deleteOne();

        // Recalculate rating
        const avgAgg = await Review.aggregate([
            { $match: { product: productId, status: 'approved' } },
            { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
        ]);
        const avg = avgAgg[0]?.avg || 0;
        const count = avgAgg[0]?.count || 0;
        await Product.updateOne({ _id: productId }, { rating: Math.round(avg * 10) / 10, reviewCount: count });

        res.status(200).json({ success: true, message: 'Review deleted' });
    } catch (error) {
        console.error('Delete review error:', error);
        res.status(500).json({ success: false, message: 'Unable to delete' });
    }
};
