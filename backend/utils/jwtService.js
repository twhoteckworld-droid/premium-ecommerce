const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if (!JWT_SECRET) {
    console.error('❌ JWT_SECRET not set in .env');
    process.exit(1);
}

/**
 * Sign a JWT for admin user.
 * Payload includes id + role for middleware checks.
 */
function signAdminToken(user) {
    return jwt.sign(
        {
            id: user._id.toString(),
            email: user.email,
            role: user.role
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

/**
 * Verify JWT. Returns decoded payload or throws.
 */
function verifyToken(token) {
    return jwt.verify(token, JWT_SECRET);
}

module.exports = { signAdminToken, verifyToken };
