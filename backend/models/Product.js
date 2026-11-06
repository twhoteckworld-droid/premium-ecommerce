const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  shortDescription: String,
  images: [{ type: String }],
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  originalPrice: { type: Number, required: true },
  salePrice: { type: Number, required: true },
  stock: { type: Number, required: true, default: 0 },
  sku: { type: String, unique: true },
  rating: { type: Number, default: 0 },
  specifications: { type: Map, of: String },
  isFeatured: { type: Boolean, default: false },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
