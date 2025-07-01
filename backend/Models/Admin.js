import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true }
});

// helper để kiểm tra mật khẩu
adminSchema.methods.verifyPassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

export default mongoose.model('Admin', adminSchema);
