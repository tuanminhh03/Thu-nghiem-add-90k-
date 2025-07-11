import mongoose from 'mongoose';

const pageViewSchema = new mongoose.Schema(
  {
    path: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model('PageView', pageViewSchema);
