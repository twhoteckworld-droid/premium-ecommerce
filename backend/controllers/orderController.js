const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { notifyNewOrder } = require('../services/notificationService');

// ============================================================
// CREATE ORDER (Public)
// ============================================================
exports.createOrder = async (req, res) => {
    const reserved = [];

    try {
        const { customerDetails, items } = req.body;

        if (!customerDetails || !Array.isArray(items) ||
            items.length === 0 || items.length > 20) {
            return res.status(400).json({
                success: false,
                message: 'Invalid order details'
            });
        }

        const { name, phone, address, city, pincode, email } = customerDetails;

        if (
            typeof name !== 'string' || !name.trim() || name.length > 80 ||
            typeof phone !== 'string' || !/^[6-9]\d{9}$/.test(phone) ||
            typeof address !== 'string' || !address.trim() || address.length > 300 ||
            typeof city !== 'string' || !city.trim() || city.length > 60 ||
            typeof pincode !== 'string' || !/^[1-9]\d{5}$/.test(pincode) ||
            (email && (typeof email !== 'string' || email.length > 120))
        ) {
            return res.status(400).json({
                success: false,
                message: 'Please provide valid customer details'
            });
        }

        const quantities = new Map();

        for (const item of items) {
            if (
                !item.productId ||
                !mongoose.isValidObjectId(item.productId) ||
                !Number.isInteger(item.quantity) ||
                item.quantity < 1 || item.quantity > 10
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid product or quantity'
                });
            }

            const id = item.productId.toString();
            quantities.set(id, (quantities.get(id) || 0) + item.quantity);
        }

        const orderItems = [];
        let subtotal = 0;

        for (const [productId, quantity] of quantities) {
            const product = await Product.findOneAndUpdate(
                {
                    _id: productId,
                    status: 'active',
                    stock: { $gte: quantity }
                },
                { $inc: { stock: -quantity } },
                { new: true }
            );

            if (!product) {
                throw new Error('PRODUCT_UNAVAILABLE');
            }

            reserved.push({ productId, quantity });

            orderItems.push({
                product: product._id,
                name: product.name,
                quantity,
                price: product.salePrice
            });

            subtotal += product.salePrice * quantity;
        }

        // Shipping: free above ₹999, else ₹49
        const shipping = subtotal >= 999 ? 0 : 49;
        const discount = 0;

        // Generate human-readable order number
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const rand = Math.random().toString(36).substring(2, 8).toUpperCase().padEnd(6, 'X');
        const orderNumber = `NOVA-${y}${m}${d}-${rand}`;

        const order = await Order.create({
            orderNumber,
            customerDetails: {
                name: name.trim(),
                phone,
                email: email ? email.trim() : undefined,
                address: address.trim(),
                city: city.trim(),
                pincode
            },
            items: orderItems,
            subtotal,
            discount,
            shipping,
            total: subtotal - discount + shipping,
            paymentStatus: 'Pending',
            orderStatus: 'Payment Pending'
        });

        res.status(201).json({
        

    success: true,
            message: 'Order created successfully',
            order: {
                id: order._id,
                orderNumber: order.orderNumber,
                subtotal: order.subtotal,
                shipping: order.shipping,
                total: order.total,
                paymentStatus: order.paymentStatus,
                orderStatus: order.orderStatus
            }
        });

    } catch (error) {
        // Rollback reserved stock
        for (const item of reserved) {
            await Product.updateOne(
                { _id: item.productId },
                { $inc: { stock: item.quantity } }
            );
        }

        if (error.message === 'PRODUCT_UNAVAILABLE') {
            return res.status(409).json({
                success: false,
                message: 'A product is unavailable or has insufficient stock'
            });
        }

        console.error('Create order error:', error);

        res.status(500).json({
            success: false,
            message: 'Unable to create order'
        });
    }
};


// ============================================================
// GET SINGLE ORDER
// Admin (x-admin-key) OR customer with matching phone last 4
// ============================================================
exports.getOrderById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid order ID'
            });
        }

        const order = await Order.findById(id).lean();

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check access: JWT admin OR x-admin-key OR customer phone verify
        const jwtUser = req.user; // set by authMiddleware if applied
        const adminKey = req.headers['x-admin-key'];
        const isAdminViaKey = adminKey && adminKey === process.env.ADMIN_API_KEY;
        const isAdminViaJwt = jwtUser && jwtUser.role === 'admin';

        if (!isAdminViaKey && !isAdminViaJwt) {
            const verifyPhone = String(req.query.phone || '').trim();
            const expectedLast4 = order.customerDetails.phone.slice(-4);

            if (!verifyPhone || verifyPhone.slice(-4) !== expectedLast4) {
                return res.status(403).json({
                    success: false,
                    message: 'Provide phone (last 4 digits) to view this order'
                });
            }
        }

        res.status(200).json({
            success: true,
            order
        });

    } catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({
            success: false,
            message: 'Unable to fetch order'
        });
    }
};


// ============================================================
// GET ALL ORDERS (Admin only)
// Query: page, limit, status, from, to, search
// ============================================================
exports.getOrders = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            status,
            from,
            to,
            search
        } = req.query;

        const filter = {};

        if (status && typeof status === 'string') {
            filter.orderStatus = status;
        }

        if (from || to) {
            filter.createdAt = {};
            if (from) filter.createdAt.$gte = new Date(from);
            if (to) filter.createdAt.$lte = new Date(to);
        }

        if (search && typeof search === 'string') {
            filter.$or = [
                { orderNumber: { $regex: search, $options: 'i' } },
                { 'customerDetails.name': { $regex: search, $options: 'i' } },
                { 'customerDetails.phone': { $regex: search, $options: 'i' } }
            ];
        }

        const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
        const safePage = Math.max(Number(page) || 1, 1);

        const [orders, total] = await Promise.all([
            Order.find(filter)
                .sort({ createdAt: -1 })
                .limit(safeLimit)
                .skip((safePage - 1) * safeLimit)
                .lean(),
            Order.countDocuments(filter)
        ]);

        res.status(200).json({
            success: true,
            total,
            page: safePage,
            limit: safeLimit,
            orders
        });

    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Unable to fetch orders'
        });
    }
};


// ============================================================
// UPDATE ORDER STATUS (Admin only)
// ============================================================
exports.updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { orderStatus } = req.body;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid order ID'
            });
        }

        const validStatuses = [
            'Payment Pending',
            'Confirmed',
            'Processing',
            'Shipped',
            'Out for Delivery',
            'Delivered',
            'Cancelled'
        ];

        if (!orderStatus || !validStatuses.includes(orderStatus)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid orderStatus. Allowed: ' + validStatuses.join(', ')
            });
        }

        const order = await Order.findById(id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        if (order.orderStatus === 'Delivered' && orderStatus !== 'Delivered') {
            return res.status(400).json({
                success: false,
                message: 'Delivered orders cannot be changed'
            });
        }

        if (order.orderStatus === 'Cancelled' && orderStatus !== 'Cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Cancelled orders cannot be reactivated'
            });
        }

        order.orderStatus = orderStatus;
        await order.save();

        res.status(200).json({
            success: true,
            message: 'Order status updated',
            order: {
                id: order._id,
                orderNumber: order.orderNumber,
                orderStatus: order.orderStatus,
                paymentStatus: order.paymentStatus
            }
        });

    } catch (error) {
        console.error('Update order status error:', error);
        res.status(500).json({
            success: false,
            message: 'Unable to update order status'
        });
    }
};

// ============================================================
// CANCEL ORDER (Admin only)
// Restores stock, marks payment as Refunded if Paid
// ============================================================
exports.cancelOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid order ID'
            });
        }

        const order = await Order.findById(id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Prevent cancel if already cancelled or delivered
        if (order.orderStatus === 'Cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Order is already cancelled'
            });
        }

        if (order.orderStatus === 'Delivered') {
            return res.status(400).json({
                success: false,
                message: 'Delivered orders cannot be cancelled'
            });
        }

        // Prevent cancel if shipped or out for delivery (business rule)
        if (['Shipped', 'Out for Delivery'].includes(order.orderStatus)) {
            return res.status(400).json({
                success: false,
                message: `Cannot cancel order in "${order.orderStatus}" status. Contact customer support.`
            });
        }

        // Restore stock for all items
        for (const item of order.items) {
            if (item.product) {
                await Product.updateOne(
                    { _id: item.product },
                    { $inc: { stock: item.quantity } }
                );
            }
        }

        // Update order
        order.orderStatus = 'Cancelled';

        // If payment was already made, mark for refund
        if (order.paymentStatus === 'Paid') {
            order.paymentStatus = 'Refunded';
        }

        await order.save();

        res.status(200).json({
            success: true,
            message: 'Order cancelled. Stock restored.',
            order: {
                id: order._id,
                orderNumber: order.orderNumber,
                orderStatus: order.orderStatus,
                paymentStatus: order.paymentStatus
            }
        });

    } catch (error) {
        console.error('Cancel order error:', error);
        res.status(500).json({
            success: false,
            message: 'Unable to cancel order'
        });
    }
};
