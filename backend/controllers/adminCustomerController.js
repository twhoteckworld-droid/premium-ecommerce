const mongoose = require('mongoose');
const User = require('../models/User');
const Order = require('../models/Order');

exports.list = async (req, res) => {
    try {
        const { page = 1, limit = 20, search } = req.query;
        const filter = { role: 'customer' };

        if (search && typeof search === 'string') {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } }
            ];
        }

        const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
        const safePage = Math.max(Number(page) || 1, 1);

        const [customers, total] = await Promise.all([
            User.find(filter).select('-passwordHash').sort({ createdAt: -1 }).limit(safeLimit).skip((safePage - 1) * safeLimit).lean(),
            User.countDocuments(filter)
        ]);

        const phones = customers.map(c => c.phone).filter(Boolean);
        const orderStats = await Order.aggregate([
            { $match: { 'customerDetails.phone': { $in: phones } } },
            {
                $group: {
                    _id: '$customerDetails.phone',
                    totalOrders: { $sum: 1 },
                    totalSpent: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'Paid'] }, '$total', 0] } },
                    lastOrderAt: { $max: '$createdAt' }
                }
            }
        ]);
        const statsMap = {};
        orderStats.forEach(s => { statsMap[s._id] = s; });

        const enriched = customers.map(c => ({
            ...c,
            totalOrders: statsMap[c.phone]?.totalOrders || 0,
            totalSpent: statsMap[c.phone]?.totalSpent || 0,
            lastOrderAt: statsMap[c.phone]?.lastOrderAt || null
        }));

        res.status(200).json({ success: true, total, page: safePage, limit: safeLimit, customers: enriched });
    } catch (error) {
        console.error('Admin list customers error:', error);
        res.status(500).json({ success: false, message: 'Unable to load customers' });
    }
};

exports.getOne = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: 'Invalid ID' });
        }

        const customer = await User.findById(id).select('-passwordHash').lean();
        if (!customer) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }

        const orders = await Order.find({ 'customerDetails.phone': customer.phone })
            .sort({ createdAt: -1 })
            .select('orderNumber total paymentStatus orderStatus createdAt items')
            .lean();

        const totalOrders = orders.length;
        const totalSpent = orders.filter(o => o.paymentStatus === 'Paid').reduce((sum, o) => sum + o.total, 0);
        const lastOrder = orders[0]?.createdAt || null;

        res.status(200).json({
            success: true,
            customer: { ...customer, totalOrders, totalSpent, lastOrderAt: lastOrder },
            orders
        });
    } catch (error) {
        console.error('Admin get customer error:', error);
        res.status(500).json({ success: false, message: 'Unable to load customer' });
    }
};
