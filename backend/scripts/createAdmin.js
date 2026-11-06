/**
 * One-time script: create initial admin from .env
 * Usage: node backend/scripts/createAdmin.js
 * Idempotent: if admin email exists, updates role to admin (safe re-run).
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const User = require('../models/User');
const connectDB = require('../config/database');

async function run() {
    try {
        await connectDB();

        const email = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
        const passwordHash = process.env.ADMIN_PASSWORD_HASH;
        const name = process.env.ADMIN_NAME || 'Admin';

        if (!email || !passwordHash) {
            console.error('❌ ADMIN_EMAIL or ADMIN_PASSWORD_HASH missing in .env');
            process.exit(1);
        }

        let user = await User.findOne({ email });

        if (user) {
            user.role = 'admin';
            user.passwordHash = passwordHash;
            user.name = name;
            await user.save();
            console.log('✅ Existing user promoted to admin:', email);
        } else {
            user = await User.create({
                name,
                email,
                phone: '0000000000', // placeholder; admin doesn't need real phone
                passwordHash,
                role: 'admin'
            });
            console.log('✅ Admin user created:', email);
        }

        console.log('');
        console.log('📋 Admin login credentials:');
        console.log('   Email   :', email);
        console.log('   Password: (the one you used to generate ADMIN_PASSWORD_HASH)');
        console.log('');
        console.log('⚠️  Change password after first login!');

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

run();
