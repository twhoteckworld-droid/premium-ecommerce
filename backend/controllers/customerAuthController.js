const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Order = require('../models/Order');

// Helper: JWT sign
function signCustomerToken(user) {
    return jwt.sign(
        { id: user._id.toString(), email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
}

// ============ REGISTER ============
exports.register = async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;

        if (!name || !email || !phone || !password) {
            return res.status(400).json({ success: false, message: 'All fields required' });
        }
        if (password.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be 6+ chars' });
        }

        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Email already registered' });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const user = await User.create({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            phone: phone.trim(),
            passwordHash,
            role: 'customer'
        });

        const token = signCustomerToken(user);

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            token,
            user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ success: false, message: 'Registration failed' });
    }
};

// ============ LOGIN ============
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password required' });
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() });

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const token = signCustomerToken(user);

        res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Login failed' });
    }
};

// ============ GET MY ORDERS ============
exports.myOrders = async (req, res) => {
    try {
        // req.user is set by authMiddleware
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        // Find orders by customer phone
        const orders = await Order.find({ 'customerDetails.phone': user.phone })
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json({ success: true, orders });
    } catch (error) {
        console.error('My orders error:', error);
        res.status(500).json({ success: false, message: 'Unable to fetch orders' });
    }
};

// ============ GET ME (Profile) ============
exports.me = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-passwordHash').lean();
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        res.status(200).json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Unable to fetch profile' });
    }
};
