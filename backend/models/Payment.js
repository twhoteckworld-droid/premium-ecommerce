const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  razorpayOrderId: { type: String, required: true },
  razorpayPaymentId: String,
  razorpaySignature: String,
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  status: { type: String, enum: ['Created', 'Verified', 'Failed'], default: 'Created' },
  verifiedAt: Date
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
