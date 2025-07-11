import mongoose from 'mongoose';

const netflixAccountSchema = new mongoose.Schema({
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
  note:     { type: String },
  status:   { type: String, default: 'available' }
}, { timestamps: true });

export default mongoose.model('NetflixAccount', netflixAccountSchema);
