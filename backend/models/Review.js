const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  customerName: { type: String, required: true, trim: true },
  customerPhone: { type: String, required: true, index: true },
  customerEmail: String,
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  title: { type: String, trim: true, maxlength: 100 },
  comment: { type: String, required: true, trim: true, maxlength: 1000 },
  verifiedPurchase: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },
  rejectionReason: String,
  moderatedAt: Date,
  moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// One review per customer per order per product
reviewSchema.index({ product: 1, order: 1, customerPhone: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Review', reviewSchema);
