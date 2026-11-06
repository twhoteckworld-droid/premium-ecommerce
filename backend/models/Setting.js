const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    default: 'store'
  },
  storeName: { type: String, default: 'NovaStore', trim: true, maxlength: 80 },
  storeLogo: { type: String },
  storeEmail: { type: String, trim: true, lowercase: true },
  storePhone: { type: String, trim: true },
  storeAddress: { type: String, trim: true, maxlength: 300 },
  currency: { type: String, default: 'INR', enum: ['INR', 'USD', 'EUR', 'GBP'] },
  currencySymbol: { type: String, default: '₹' },

  shipping: {
    freeShippingThreshold: { type: Number, default: 999 },
    shippingFee: { type: Number, default: 49 }
  },

  tax: {
    enabled: { type: Boolean, default: false },
    rate: { type: Number, default: 0 },
    inclusive: { type: Boolean, default: false }
  },

  notifications: {
    newOrder: { type: Boolean, default: true },
    lowStock: { type: Boolean, default: true },
    newCustomer: { type: Boolean, default: false }
  },

  social: {
    facebook: String,
    instagram: String,
    twitter: String,
    youtube: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Setting', settingSchema);
