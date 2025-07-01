// models/Customer.js
import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  paymentMethod: { type: String, required: true },
  plan: { type: String, required: true },
  purchaseDate: { type: Date, default: Date.now },
});

const Customer = mongoose.model('Customer', customerSchema);

export default Customer;
