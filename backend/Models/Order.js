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
  code: {
    type: String,
  },
  duration: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  accountEmail: {
    type: String,
  },
  accountPassword: {
    type: String,
  },
  profileId: {
    type: String,
  },
  profileName: {
    type: String,
  },
  pin: {
    type: String,
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
