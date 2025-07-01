// models/Customer.js
const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  paymentMethod: { type: String, required: true },
  plan: { type: String, required: true },
  purchaseDate: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Customer', customerSchema);
