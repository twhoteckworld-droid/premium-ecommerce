const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

// ============ HELPER: date range ============
function getDateRange(query) {
    const { from, to } = query;
    const range = {};
    if (from) {
        const f = new Date(from);
        if (!isNaN(f.getTime())) range.$gte = f;
    }
    if (to) {
        const t = new Date(to);
        if (!isNaN(t.getTime())) {
            t.setHours(23, 59, 59, 999);
            range.$lte = t;
        }
    }
    return Object.keys(range).length ? range : null;
}

// ============ SALES REPORT ============
exports.salesReport = async (req, res) => {
    try {
        const dateRange = getDateRange(req.query);
        const match = { paymentStatus: 'Paid' };
        if (dateRange) match.createdAt = dateRange;

        const [summary, dailyBreakdown] = await Promise.all([
            Order.aggregate([
                { $match: match },
                {
                    $group: {
                        _id: null,
                        totalOrders: { $sum: 1 },
                        totalRevenue: { $sum: '$total' },
                        totalDiscount: { $sum: '$discount' },
                        totalShipping: { $sum: '$shipping' },
                        avgOrderValue: { $avg: '$total' }
                    }
                }
            ]),
            Order.aggregate([
                { $match: match },
                {
                    $group: {
                        _id: {
                            y: { $year: '$createdAt' },
                            m: { $month: '$createdAt' },
                            d: { $dayOfMonth: '$createdAt' }
                        },
                        orders: { $sum: 1 },
                        revenue: { $sum: '$total' }
                    }
                },
                { $sort: { '_id.y': 1, '_id.m': 1, '_id.d': 1 } }
            ])
        ]);

        const s = summary[0] || { totalOrders: 0, totalRevenue: 0, totalDiscount: 0, totalShipping: 0, avgOrderValue: 0 };

        res.status(200).json({
            success: true,
            summary: {
                totalOrders: s.totalOrders,
                totalRevenue: Math.round(s.totalRevenue * 100) / 100,
                totalDiscount: Math.round(s.totalDiscount * 100) / 100,
                totalShipping: Math.round(s.totalShipping * 100) / 100,
                avgOrderValue: Math.round(s.avgOrderValue * 100) / 100
            },
            daily: dailyBreakdown.map(d => ({
                date: `${d._id.y}-${String(d._id.m).padStart(2, '0')}-${String(d._id.d).padStart(2, '0')}`,
                orders: d.orders,
                revenue: Math.round(d.revenue * 100) / 100
            }))
        });
    } catch (error) {
        console.error('Sales report error:', error);
        res.status(500).json({ success: false, message: 'Unable to generate report' });
    }
};

// ============ PRODUCT REPORT ============
exports.productReport = async (req, res) => {
    try {
        const dateRange = getDateRange(req.query);
        const match = { paymentStatus: 'Paid' };
        if (dateRange) match.createdAt = dateRange;

        const products = await Order.aggregate([
            { $match: match },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.product',
                    name: { $first: '$items.name' },
                    unitsSold: { $sum: '$items.quantity' },
                    revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
                    orderCount: { $sum: 1 }
                }
            },
            { $sort: { revenue: -1 } },
            { $limit: 50 }
        ]);

        // Enrich with current stock
        const productIds = products.map(p => p._id).filter(Boolean);
        const productsInfo = await Product.find({ _id: { $in: productIds } }).select('name stock images').lean();
        const infoMap = {};
        productsInfo.forEach(p => { infoMap[p._id.toString()] = p; });

        res.status(200).json({
            success: true,
            total: products.length,
            products: products.map(p => ({
                productId: p._id,
                name: p.name || infoMap[p._id]?.name || 'Unknown',
                unitsSold: p.unitsSold,
                revenue: Math.round(p.revenue * 100) / 100,
                orderCount: p.orderCount,
                currentStock: infoMap[p._id]?.stock ?? 0
            }))
        });
    } catch (error) {
        console.error('Product report error:', error);
        res.status(500).json({ success: false, message: 'Unable to generate report' });
    }
};

// ============ CUSTOMER REPORT ============
exports.customerReport = async (req, res) => {
    try {
        const dateRange = getDateRange(req.query);

        const userMatch = { role: 'customer' };
        if (dateRange) userMatch.createdAt = dateRange;

        const newCustomers = await User.countDocuments(userMatch);

        const orderMatch = { paymentStatus: 'Paid' };
        if (dateRange) orderMatch.createdAt = dateRange;

        const topSpenders = await Order.aggregate([
            { $match: orderMatch },
            {
                $group: {
                    _id: '$customerDetails.phone',
                    customerName: { $first: '$customerDetails.name' },
                    totalOrders: { $sum: 1 },
                    totalSpent: { $sum: '$total' },
                    lastOrderAt: { $max: '$createdAt' }
                }
            },
            { $sort: { totalSpent: -1 } },
            { $limit: 20 }
        ]);

        res.status(200).json({
            success: true,
            newCustomers,
            topSpenders: topSpenders.map(c => ({
                phone: c._id,
                name: c.customerName,
                totalOrders: c.totalOrders,
                totalSpent: Math.round(c.totalSpent * 100) / 100,
                lastOrderAt: c.lastOrderAt
            }))
        });
    } catch (error) {
        console.error('Customer report error:', error);
        res.status(500).json({ success: false, message: 'Unable to generate report' });
    }
};

// ============ CSV EXPORT ============
exports.exportCSV = async (req, res) => {
    try {
        const { type } = req.params;
        const dateRange = getDateRange(req.query);

        if (type === 'orders') {
            const match = {};
            if (dateRange) match.createdAt = dateRange;
            const orders = await Order.find(match).sort({ createdAt: -1 }).limit(1000).lean();

            const headers = ['Order Number', 'Customer', 'Phone', 'Total', 'Payment', 'Status', 'Date'];
            const rows = orders.map(o => [
                o.orderNumber,
                o.customerDetails?.name || '',
                o.customerDetails?.phone || '',
                o.total,
                o.paymentStatus,
                o.orderStatus,
                new Date(o.createdAt).toISOString().slice(0, 10)
            ]);

            return sendCSV(res, 'orders.csv', headers, rows);
        }

        if (type === 'products') {
            const match = { paymentStatus: 'Paid' };
            if (dateRange) match.createdAt = dateRange;
            const data = await Order.aggregate([
                { $match: match },
                { $unwind: '$items' },
                {
                    $group: {
                        _id: '$items.product',
                        name: { $first: '$items.name' },
                        unitsSold: { $sum: '$items.quantity' },
                        revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
                    }
                },
                { $sort: { revenue: -1 } }
            ]);

            const headers = ['Product', 'Units Sold', 'Revenue'];
            const rows = data.map(p => [p.name, p.unitsSold, Math.round(p.revenue * 100) / 100]);
            return sendCSV(res, 'products.csv', headers, rows);
        }

        if (type === 'customers') {
            const match = { paymentStatus: 'Paid' };
            if (dateRange) match.createdAt = dateRange;
            const data = await Order.aggregate([
                { $match: match },
                {
                    $group: {
                        _id: '$customerDetails.phone',
                        name: { $first: '$customerDetails.name' },
                        totalOrders: { $sum: 1 },
                        totalSpent: { $sum: '$total' }
                    }
                },
                { $sort: { totalSpent: -1 } }
            ]);

            const headers = ['Customer', 'Phone', 'Orders', 'Total Spent'];
            const rows = data.map(c => [c.name, c._id, c.totalOrders, Math.round(c.totalSpent * 100) / 100]);
            return sendCSV(res, 'customers.csv', headers, rows);
        }

        return res.status(400).json({ success: false, message: 'Invalid export type' });
    } catch (error) {
        console.error('Export CSV error:', error);
        res.status(500).json({ success: false, message: 'Unable to export' });
    }
};

function sendCSV(res, filename, headers, rows) {
    const escape = (v) => {
        const s = String(v ?? '');
        if (s.includes(',') || s.includes('"') || s.includes('\n')) {
            return '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
    };

    const csv = [
        headers.map(escape).join(','),
        ...rows.map(r => r.map(escape).join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
}
