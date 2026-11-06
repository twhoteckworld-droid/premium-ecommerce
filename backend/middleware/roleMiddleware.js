/**
 * Require specific role(s).
 * Usage: requireRole('admin') or requireRole('admin', 'manager')
 */
module.exports = function requireRole(...allowedRoles) {
    return function (req, res, next) {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied — insufficient permissions'
            });
        }

        next();
    };
};
