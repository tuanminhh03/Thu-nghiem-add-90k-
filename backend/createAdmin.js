// backend/createAdmin.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import Admin from './models/Admin.js';

dotenv.config();

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const username = 'admin';        // đổi theo ý bạn
  const password = 'secret123';    // đổi theo ý bạn

  const hash = await bcrypt.hash(password, 10);
  await Admin.create({ username, passwordHash: hash });
  console.log(`→ Tạo admin thành công: ${username} / ${password}`);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
