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
  // Mã đơn hàng
  orderCode: {
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
    enum: ['PENDING', 'PAID', 'FAILED', 'EXPIRED'],
    default: 'PAID',
  },
  purchaseDate: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
  },
  accountCookies: { type: String },
  history: [
    {
      message: String,
      date: { type: Date, default: Date.now },
    },
  ],
}, { timestamps: true });

export default model('Order', orderSchema);
