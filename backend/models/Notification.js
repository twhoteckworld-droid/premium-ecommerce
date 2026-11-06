const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['new_order', 'low_stock', 'out_of_stock', 'new_customer', 'payment_failed', 'order_cancelled'],
    required: true,
    index: true
  },
  title: { type: String, required: true, maxlength: 100 },
  message: { type: String, required: true, maxlength: 300 },
  link: { type: String },
  meta: {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  read: { type: Boolean, default: false, index: true },
  readAt: Date
}, { timestamps: true });

notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
