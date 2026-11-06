const mongoose = require('mongoose');

const stockHistorySchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  productName: String,
  change: {
    type: Number,
    required: true  // positive = added, negative = removed
  },
  previousStock: { type: Number, required: true },
  newStock: { type: Number, required: true },
  reason: {
    type: String,
    enum: ['manual_adjust', 'order_placed', 'order_cancelled', 'product_created', 'restock'],
    default: 'manual_adjust',
    index: true
  },
  note: String,
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  orderRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  }
}, { timestamps: true });

stockHistorySchema.index({ createdAt: -1 });

module.exports = mongoose.model('StockHistory', stockHistorySchema);
