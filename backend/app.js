const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Public routes
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const settingRoutes = require('./routes/settingRoutes');
const customerAuthRoutes = require('./routes/customerAuthRoutes');

// Admin routes
const adminAuthRoutes = require('./routes/adminAuthRoutes');
const adminDashboardRoutes = require('./routes/adminDashboardRoutes');
const adminProductRoutes = require('./routes/adminProductRoutes');
const adminCategoryRoutes = require('./routes/adminCategoryRoutes');
const adminCustomerRoutes = require('./routes/adminCustomerRoutes');
const adminPaymentRoutes = require('./routes/adminPaymentRoutes');
const adminCouponRoutes = require('./routes/adminCouponRoutes');
const adminInventoryRoutes = require('./routes/adminInventoryRoutes');
const adminReviewRoutes = require('./routes/adminReviewRoutes');
const adminSettingRoutes = require('./routes/adminSettingRoutes');
const adminNotificationRoutes = require('./routes/adminNotificationRoutes');
const adminReportRoutes = require('./routes/adminReportRoutes');

const app = express();

app.use(helmet({ contentSecurityPolicy: { directives: { imgSrc: ["'self'", 'data:', 'https:'] } } }));
app.use(cors({ origin: process.env.FRONTEND_URL || true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

// ============ PUBLIC API ============
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/auth', customerAuthRoutes);

// ============ ADMIN API ============
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/dashboard', adminDashboardRoutes);
app.use('/api/admin/products', adminProductRoutes);
app.use('/api/admin/categories', adminCategoryRoutes);
app.use('/api/admin/customers', adminCustomerRoutes);
app.use('/api/admin/payments', adminPaymentRoutes);
app.use('/api/admin/coupons', adminCouponRoutes);
app.use('/api/admin/inventory', adminInventoryRoutes);
app.use('/api/admin/reviews', adminReviewRoutes);
app.use('/api/admin/settings', adminSettingRoutes);
app.use('/api/admin/notifications', adminNotificationRoutes);
app.use('/api/admin/reports', adminReportRoutes);

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, '../frontend')));

// 404
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
});

module.exports = app;
