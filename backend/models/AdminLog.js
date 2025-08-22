import mongoose from 'mongoose';

const adminLogSchema = new mongoose.Schema({
  admin: { type: String, required: true },
  action: { type: String, required: true },
  target: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('AdminLog', adminLogSchema);
