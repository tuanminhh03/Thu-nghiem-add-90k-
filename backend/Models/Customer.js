// models/Customer.js
import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  phone:  { type: String, required: true, unique: true },
  amount: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.model('Customer', customerSchema);
