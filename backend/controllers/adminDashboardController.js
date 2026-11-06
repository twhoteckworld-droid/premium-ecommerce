const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Payment = require('../models/Payment');

// ============================================================
// GET /api/admin/dashboard/stats
// Returns all summary card numbers
// ============================================================
exports.getStats = async (req, res) => {
    try {
        const [
            totalOrders,
            totalProducts,
            totalCustomers,
            pendingOrders,
            deliveredOrders,
            cancelledOrders,
            lowStockProducts,
            paidOrders
        ] = await Promise.all([
            Order.countDocuments(),
            Product.countDocuments(),
            User.countDocuments({ role: 'customer' }),
            Order.countDocuments({ orderStatus: 'Payment Pending' }),
            Order.countDocuments({ orderStatus: 'Delivered' }),
            Order.countDocuments({ orderStatus: 'Cancelled' }),
            Product.countDocuments({ stock: { $gt: 0, $lt: 5 } }),
            Order.find({ paymentStatus: 'Paid' }).select('total').lean()
        ]);

        const totalRevenue = paidOrders.reduce((sum, o) => sum + (o.total || 0), 0);

        res.status(200).json({
            success: true,
            stats: {
                totalRevenue,
                totalOrders,
                totalProducts,
                totalCustomers,
                pendingOrders,
                deliveredOrders,
                cancelledOrders,
                lowStockProducts
            }
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ success: false, message: 'Unable to load stats' });
    }
};

// ============================================================
// GET /api/admin/dashboard/charts
// Returns chart data: daily sales (7d), monthly revenue (12m),
// order status distribution, top 5 products
// ============================================================
exports.getCharts = async (req, res) => {
    try {
        const now = new Date();

        // --- Last 7 days daily sales ---
        const daysAgo = new Date(now);
        daysAgo.setDate(daysAgo.getDate() - 6);
        daysAgo.setHours(0, 0, 0, 0);

        const dailyData = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: daysAgo },
                    paymentStatus: 'Paid'
                }
            },
            {
                $group: {
                    _id: {
                        y: { $year: '$createdAt' },
                        m: { $month: '$createdAt' },
                        d: { $dayOfMonth: '$createdAt' }
                    },
                    revenue: { $sum: '$total' },
                    orders: { $sum: 1 }
                }
            },
            { $sort: { '_id.y': 1, '_id.m': 1, '_id.d': 1 } }
        ]);

        // Fill missing days with 0
        const dailyLabels = [];
        const dailyRevenue = [];
        const dailyOrders = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(daysAgo);
            d.setDate(d.getDate() + i);
            const y = d.getFullYear();
            const m = d.getMonth() + 1;
            const day = d.getDate();
            const found = dailyData.find(x => x._id.y === y && x._id.m === m && x._id.d === day);
            dailyLabels.push(d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }));
            dailyRevenue.push(found ? found.revenue : 0);
            dailyOrders.push(found ? found.orders : 0);
        }

        // --- Last 12 months revenue ---
        const monthsAgo = new Date(now);
        monthsAgo.setMonth(monthsAgo.getMonth() - 11);
        monthsAgo.setDate(1);
        monthsAgo.setHours(0, 0, 0, 0);

        const monthlyData = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: monthsAgo },
                    paymentStatus: 'Paid'
                }
            },
            {
                $group: {
                    _id: {
                        y: { $year: '$createdAt' },
                        m: { $month: '$createdAt' }
                    },
                    revenue: { $sum: '$total' }
                }
            },
            { $sort: { '_id.y': 1, '_id.m': 1 } }
        ]);

        const monthlyLabels = [];
        const monthlyRevenue = [];
        for (let i = 0; i < 12; i++) {
            const d = new Date(monthsAgo);
            d.setMonth(d.getMonth() + i);
            const y = d.getFullYear();
            const m = d.getMonth() + 1;
            const found = monthlyData.find(x => x._id.y === y && x._id.m === m);
            monthlyLabels.push(d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }));
            monthlyRevenue.push(found ? found.revenue : 0);
        }

        // --- Order status distribution ---
        const statusData = await Order.aggregate([
            { $group: { _id: '$orderStatus', count: { $sum: 1 } } }
        ]);
        const statusLabels = statusData.map(s => s._id);
        const statusCounts = statusData.map(s => s.count);

        // --- Top 5 products by quantity sold ---
        const topProducts = await Order.aggregate([
            { $match: { paymentStatus: 'Paid' } },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.product',
                    name: { $first: '$items.name' },
                    quantity: { $sum: '$items.quantity' },
                    revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
                }
            },
            { $sort: { quantity: -1 } },
            { $limit: 5 }
        ]);

        res.status(200).json({
            success: true,
            charts: {
                daily: {
                    labels: dailyLabels,
                    revenue: dailyRevenue,
                    orders: dailyOrders
                },
                monthly: {
                    labels: monthlyLabels,
                    revenue: monthlyRevenue
                },
                statusDistribution: {
                    labels: statusLabels,
                    counts: statusCounts
                },
                topProducts: topProducts.map(p => ({
                    name: p.name || 'Unknown',
                    quantity: p.quantity,
                    revenue: p.revenue
                }))
            }
        });
    } catch (error) {
        console.error('Dashboard charts error:', error);
        res.status(500).json({ success: false, message: 'Unable to load charts' });
    }
};

// ============================================================
// GET /api/admin/dashboard/recent
// Returns recent orders, recent customers, low stock products
// ============================================================
exports.getRecent = async (req, res) => {
    try {
        const [recentOrders, recentCustomers, lowStock] = await Promise.all([
            Order.find()
                .sort({ createdAt: -1 })
                .limit(5)
                .select('orderNumber customerDetails.name total orderStatus paymentStatus createdAt')
                .lean(),
            User.find({ role: 'customer' })
                .sort({ createdAt: -1 })
                .limit(5)
                .select('name email phone createdAt')
                .lean(),
            Product.find({ stock: { $gt: 0, $lt: 5 }, status: 'active' })
                .sort({ stock: 1 })
                .limit(5)
                .select('name stock salePrice images')
                .lean()
        ]);

        res.status(200).json({
            success: true,
            recent: {
                orders: recentOrders.map(o => ({
                    orderNumber: o.orderNumber,
                    customerName: o.customerDetails?.name || 'Guest',
                    total: o.total,
                    orderStatus: o.orderStatus,
                    paymentStatus: o.paymentStatus,
                    createdAt: o.createdAt
                })),
                customers: recentCustomers,
                lowStock
            }
        });
    } catch (error) {
        console.error('Dashboard recent error:', error);
        res.status(500).json({ success: false, message: 'Unable to load recent data' });
    }
};
