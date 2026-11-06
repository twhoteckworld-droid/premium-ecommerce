const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true
  },
  description: { type: String, trim: true, maxlength: 200 },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true,
    default: 'percentage'
  },
  discountValue: { type: Number, required: true, min: 0 },
  minOrderValue: { type: Number, default: 0, min: 0 },
  maxDiscount: { type: Number, default: 0, min: 0 },
  startDate: { type: Date, default: Date.now },
  expiryDate: { type: Date, required: true },
  usageLimit: { type: Number, default: 0, min: 0 },
  usedCount: { type: Number, default: 0, min: 0 },
  perCustomerLimit: { type: Number, default: 1, min: 1 },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, { timestamps: true });

module.exports = mongoose.model('Coupon', couponSchema);
