const mongoose = require('mongoose');
const Coupon = require('../models/Coupon');

// ============ LIST ============
exports.list = async (req, res) => {
    try {
        const { page = 1, limit = 20, search, status } = req.query;
        const filter = {};

        if (status && ['active', 'inactive'].includes(status)) filter.status = status;
        if (search && typeof search === 'string') {
            filter.$or = [
                { code: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
        const safePage = Math.max(Number(page) || 1, 1);

        const [coupons, total] = await Promise.all([
            Coupon.find(filter).sort({ createdAt: -1 }).limit(safeLimit).skip((safePage - 1) * safeLimit).lean(),
            Coupon.countDocuments(filter)
        ]);

        res.status(200).json({ success: true, total, page: safePage, limit: safeLimit, coupons });
    } catch (error) {
        console.error('Admin list coupons error:', error);
        res.status(500).json({ success: false, message: 'Unable to load coupons' });
    }
};

// ============ GET ONE ============
exports.getOne = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });
        const coupon = await Coupon.findById(id).lean();
        if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
        res.status(200).json({ success: true, coupon });
    } catch (error) {
        console.error('Admin get coupon error:', error);
        res.status(500).json({ success: false, message: 'Unable to load coupon' });
    }
};

// ============ CREATE ============
exports.create = async (req, res) => {
    try {
        const {
            code, description, discountType, discountValue,
            minOrderValue, maxDiscount, startDate, expiryDate,
            usageLimit, perCustomerLimit, status
        } = req.body;

        if (!code || typeof code !== 'string' || !code.trim()) {
            return res.status(400).json({ success: false, message: 'Coupon code required' });
        }

        const upperCode = code.trim().toUpperCase();

        // Check unique
        const exists = await Coupon.findOne({ code: upperCode });
        if (exists) {
            return res.status(400).json({ success: false, message: 'Coupon code already exists' });
        }

        if (!['percentage', 'fixed'].includes(discountType)) {
            return res.status(400).json({ success: false, message: 'discountType must be percentage or fixed' });
        }

        const dv = Number(discountValue);
        if (isNaN(dv) || dv <= 0) {
            return res.status(400).json({ success: false, message: 'Discount value must be > 0' });
        }

        if (discountType === 'percentage' && dv > 100) {
            return res.status(400).json({ success: false, message: 'Percentage cannot exceed 100' });
        }

        if (!expiryDate) {
            return res.status(400).json({ success: false, message: 'Expiry date required' });
        }

        const expiry = new Date(expiryDate);
        if (isNaN(expiry.getTime()) || expiry <= new Date()) {
            return res.status(400).json({ success: false, message: 'Expiry must be a future date' });
        }

        const coupon = await Coupon.create({
            code: upperCode,
            description: (description || '').trim(),
            discountType,
            discountValue: dv,
            minOrderValue: Number(minOrderValue) || 0,
            maxDiscount: Number(maxDiscount) || 0,
            startDate: startDate ? new Date(startDate) : new Date(),
            expiryDate: expiry,
            usageLimit: Number(usageLimit) || 0,
            perCustomerLimit: Number(perCustomerLimit) || 1,
            status: status === 'inactive' ? 'inactive' : 'active'
        });

        res.status(201).json({ success: true, message: 'Coupon created', coupon });
    } catch (error) {
        console.error('Admin create coupon error:', error);
        res.status(500).json({ success: false, message: 'Unable to create coupon' });
    }
};

// ============ UPDATE ============
exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });

        const coupon = await Coupon.findById(id);
        if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });

        const {
            code, description, discountType, discountValue,
            minOrderValue, maxDiscount, startDate, expiryDate,
            usageLimit, perCustomerLimit, status
        } = req.body;

        if (code !== undefined) {
            const upperCode = String(code).trim().toUpperCase();
            if (!upperCode) return res.status(400).json({ success: false, message: 'Code cannot be empty' });
            if (upperCode !== coupon.code) {
                const exists = await Coupon.findOne({ code: upperCode, _id: { $ne: coupon._id } });
                if (exists) return res.status(400).json({ success: false, message: 'Coupon code already exists' });
                coupon.code = upperCode;
            }
        }

        if (description !== undefined) coupon.description = String(description).trim();

        if (discountType !== undefined) {
            if (!['percentage', 'fixed'].includes(discountType)) {
                return res.status(400).json({ success: false, message: 'Invalid discountType' });
            }
            coupon.discountType = discountType;
        }

        if (discountValue !== undefined) {
            const dv = Number(discountValue);
            if (isNaN(dv) || dv <= 0) return res.status(400).json({ success: false, message: 'Value > 0' });
            if (coupon.discountType === 'percentage' && dv > 100) {
                return res.status(400).json({ success: false, message: 'Percentage <= 100' });
            }
            coupon.discountValue = dv;
        }

        if (minOrderValue !== undefined) coupon.minOrderValue = Number(minOrderValue) || 0;
        if (maxDiscount !== undefined) coupon.maxDiscount = Number(maxDiscount) || 0;
        if (startDate !== undefined) coupon.startDate = new Date(startDate);
        if (expiryDate !== undefined) {
            const expiry = new Date(expiryDate);
            if (isNaN(expiry.getTime())) return res.status(400).json({ success: false, message: 'Invalid expiry' });
            coupon.expiryDate = expiry;
        }
        if (usageLimit !== undefined) coupon.usageLimit = Number(usageLimit) || 0;
        if (perCustomerLimit !== undefined) coupon.perCustomerLimit = Number(perCustomerLimit) || 1;
        if (status !== undefined) coupon.status = status === 'inactive' ? 'inactive' : 'active';

        await coupon.save();
        res.status(200).json({ success: true, message: 'Coupon updated', coupon });
    } catch (error) {
        console.error('Admin update coupon error:', error);
        res.status(500).json({ success: false, message: 'Unable to update coupon' });
    }
};

// ============ DELETE ============
exports.remove = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });
        const coupon = await Coupon.findById(id);
        if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
        await coupon.deleteOne();
        res.status(200).json({ success: true, message: 'Coupon deleted' });
    } catch (error) {
        console.error('Admin delete coupon error:', error);
        res.status(500).json({ success: false, message: 'Unable to delete coupon' });
    }
};

// ============ TOGGLE STATUS ============
exports.toggleStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const coupon = await Coupon.findById(id);
        if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
        coupon.status = coupon.status === 'active' ? 'inactive' : 'active';
        await coupon.save();
        res.status(200).json({ success: true, message: 'Status toggled', coupon: { _id: coupon._id, status: coupon.status } });
    } catch (error) {
        console.error('Admin toggle coupon error:', error);
        res.status(500).json({ success: false, message: 'Unable to toggle' });
    }
};
