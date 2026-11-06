/**
 * TEMPORARY admin auth via x-admin-key header.
 * Phase 3 mein JWT-based auth se replace hoga.
 */

module.exports = function adminAuth(req, res, next) {
    const key = req.headers['x-admin-key'];

    if (!key || !process.env.ADMIN_API_KEY) {
        return res.status(401).json({
            success: false,
            message: 'Admin authentication required'
        });
    }

    if (key !== process.env.ADMIN_API_KEY) {
        return res.status(403).json({
            success: false,
            message: 'Invalid admin key'
        });
    }

    next();
};
