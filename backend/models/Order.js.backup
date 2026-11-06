const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  customerDetails: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: String,
    address: { type: String, required: true },
    city: String,
    state: String,
    pincode: { type: String, required: true }
  },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: String,
    quantity: { type: Number, required: true },
    price: { type: Number, required: true }
  }],
  subtotal: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  shipping: { type: Number, default: 0 },
  total: { type: Number, required: true },
  paymentStatus: { type: String, enum: ['Pending', 'Paid', 'Failed', 'Refunded'], default: 'Pending' },
  orderStatus: { 
    type: String, 
    enum: ['Payment Pending', 'Confirmed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'], 
    default: 'Payment Pending' 
  }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
