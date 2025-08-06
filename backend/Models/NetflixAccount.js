import mongoose from 'mongoose';

const profileSchema = new mongoose.Schema({
  profileId:    { type: String, required: true },
  status:       { type: String, enum: ['available', 'used'], default: 'available' },
  customerName: { type: String },
  contactEmail: { type: String }
}, { _id: false });

const netflixAccountSchema = new mongoose.Schema({
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
  note:     { type: String },
  profiles: {
    type: [profileSchema],
    default: () => Array.from({ length: 5 }, (_, i) => ({ profileId: `P${i + 1}` }))
  }
}, { timestamps: true });

export default mongoose.model('NetflixAccount', netflixAccountSchema);
