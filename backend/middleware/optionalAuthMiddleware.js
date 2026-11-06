const User = require('../models/User');
const { verifyToken } = require('../utils/jwtService');

/**
 * Optional auth: sets req.user if valid token present, does NOT block if missing.
 */
module.exports = async function optionalAuthMiddleware(req, res, next) {
    try {
        const header = req.headers.authorization || '';
        const token = header.startsWith('Bearer ') ? header.slice(7) : null;

        if (!token) return next(); // no token = continue as guest

        try {
            const decoded = verifyToken(token);
            const user = await User.findById(decoded.id).select('-passwordHash').lean();
            if (user) req.user = user;
        } catch (err) {
            // Invalid token → just continue as guest
        }
        next();
    } catch (err) {
        next();
    }
};
