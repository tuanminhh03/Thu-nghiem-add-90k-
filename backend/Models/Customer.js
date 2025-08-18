// models/Customer.js
import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  name:   { type: String, required: true },
  phone:  { type: String, required: true, unique: true },
  pin:    { type: String, required: true },
  amount: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.model('Customer', customerSchema);
