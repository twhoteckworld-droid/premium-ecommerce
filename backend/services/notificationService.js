const Notification = require('../models/Notification');

/**
 * Create a notification (fire-and-forget, never throws).
 * Usage: await createNotification({ type, title, message, link, meta })
 */
async function createNotification({ type, title, message, link, meta = {} }) {
    try {
        return await Notification.create({ type, title, message, link, meta });
    } catch (err) {
        console.error('Notification create failed:', err.message);
        return null;
    }
}

/**
 * Helper: notify on new order
 */
async function notifyNewOrder(order) {
    return createNotification({
        type: 'new_order',
        title: 'New Order Placed',
        message: `${order.customerDetails.name} placed order ${order.orderNumber} — ₹${order.total}`,
        link: `/admin/dashboard.html#orders`,
        meta: { orderId: order._id }
    });
}

/**
 * Helper: notify on low stock
 */
async function notifyLowStock(product) {
    return createNotification({
        type: 'low_stock',
        title: 'Low Stock Alert',
        message: `${product.name} has only ${product.stock} unit(s) left`,
        link: `/admin/dashboard.html#inventory`,
        meta: { productId: product._id }
    });
}

module.exports = { createNotification, notifyNewOrder, notifyLowStock };
