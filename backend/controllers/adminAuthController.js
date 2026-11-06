const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { signAdminToken } = require('../utils/jwtService');

/**
 * POST /api/admin/auth/login
 * Body: { email, password }
 * Returns: { token, user }
 */
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Email and password required'
            });
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        if (user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied — admin only'
            });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const token = signAdminToken(user);

        return res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed'
        });
    }
};

/**
 * GET /api/admin/auth/me
 * Requires JWT. Returns current admin user.
 */
exports.me = async (req, res) => {
    res.status(200).json({
        success: true,
        user: req.user
    });
};

/**
 * POST /api/admin/auth/change-password
 * Body: { currentPassword, newPassword }
 */
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword || newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Current password required, new password must be 8+ chars'
            });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const ok = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!ok) {
            return res.status(401).json({ success: false, message: 'Current password incorrect' });
        }

        user.passwordHash = await bcrypt.hash(newPassword, 10);
        await user.save();

        res.status(200).json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ success: false, message: 'Unable to change password' });
    }
};
