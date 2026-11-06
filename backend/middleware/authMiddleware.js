const User = require('../models/User');
const { verifyToken } = require('../utils/jwtService');

/**
 * Protect route: requires valid JWT in Authorization header.
 * Attaches req.user = { id, email, role, _id } (full user from DB).
 */
module.exports = async function authMiddleware(req, res, next) {
    try {
        const header = req.headers.authorization || '';
        const token = header.startsWith('Bearer ') ? header.slice(7) : null;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        let decoded;
        try {
            decoded = verifyToken(token);
        } catch (err) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }

        const user = await User.findById(decoded.id).select('-passwordHash').lean();

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({
            success: false,
            message: 'Authentication error'
        });
    }
};
