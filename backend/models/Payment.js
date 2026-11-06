const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true
  },
  orderNumber: { type: String, index: true },
  razorpayOrderId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  razorpayPaymentId: { type: String, index: true, sparse: true },
  razorpaySignature: String,
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  status: {
    type: String,
    enum: ['Created', 'Verified', 'Failed'],
    default: 'Created',
    index: true
  },
  mode: {
    type: String,
    enum: ['mock', 'live'],
    default: 'mock'
  },
  paymentMethod: String,
  failureReason: String,
  verifiedAt: Date
}, { timestamps: true });

paymentSchema.index({ order: 1, status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
