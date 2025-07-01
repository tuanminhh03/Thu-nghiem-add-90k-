// models/Order.js
import mongoose from 'mongoose';
const { Schema, model, Types } = mongoose;

const orderSchema = new Schema({
  user: {
    type: Types.ObjectId,
    ref: 'Customer',
    required: true,
  },
  plan: {
    type: String,
    required: true,
  },
  duration: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['PENDING', 'PAID', 'FAILED'],
    default: 'PAID',
  },
  purchaseDate: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

export default model('Order', orderSchema);
