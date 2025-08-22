import mongoose from 'mongoose';

const profileSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true
    },
    name: {
      type: String,
      default: ''
    },
    pin: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['empty', 'used'],
      default: 'empty'
    },
    customerPhone: {
      type: String
    },
    purchaseDate: {
      type: Date
    },
    expirationDate: {
      type: Date
    }
  },
  { _id: false }
);

const netflixAccountSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true
    },
    password: {
      type: String,
      required: true
    },
    note: {
      type: String
    },
    plan: {
      type: String,
      enum: ['Gói tiết kiệm', 'Gói cao cấp'],
      default: 'Gói cao cấp'
    },
    profiles: {
      type: [profileSchema],
      default: () =>
        Array.from({ length: 5 }, (_, i) => ({ id: `P${i + 1}`, name: '', pin: '' }))
    }
  },
  { timestamps: true }
);

export default mongoose.model('NetflixAccount', netflixAccountSchema);
