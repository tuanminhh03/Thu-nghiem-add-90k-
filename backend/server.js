// backend/server.js
import express  from 'express';
import cors     from 'cors';
import mongoose from 'mongoose';
import jwt      from 'jsonwebtoken';
import dotenv   from 'dotenv';

import Customer from './models/Customer.js';
import Order    from './models/Order.js';

dotenv.config();

const app = express();
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('🗄️  MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

/** Middleware: Xác thực JWT chung */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Không có token' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Token không hợp lệ' });
  }
}


/** 1. Đăng ký/đăng nhập user bằng phone */
app.post('/api/auth/login', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ message: 'Thiếu số điện thoại' });

  try {
    let user = await Customer.findOne({ phone });
    if (!user) {
      user = await Customer.create({ phone, amount: 0 });
    }
    const token = jwt.sign(
      { id: user._id, phone: user.phone },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      token,
      user: { id: user._id, phone: user.phone, amount: user.amount }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server lỗi' });
  }
});


/** 3. Tạo đơn hàng (customer thanh toán – trừ tiền) */
app.post('/api/orders', authenticate, async (req, res) => {
  const { plan, duration, amount } = req.body;
  if (!plan || !duration || !amount) {
    return res.status(400).json({ message: 'Thiếu dữ liệu đơn hàng' });
  }
  try {
    // Lưu đơn hàng
    const order = await Order.create({
      user:     req.user.id,
      plan,
      duration,
      amount,
      status:   'PAID'
    });
    // Trừ tiền customer.balance
    await Customer.findByIdAndUpdate(
      req.user.id,
      { $inc: { amount: -amount } }
    );
    res.status(201).json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi tạo đơn hàng' });
  }
});

/** 4. Lấy lịch sử đơn hàng của chính user */
app.get('/api/orders', authenticate, async (req, res) => {
  try {
    const orders = await Order
      .find({ user: req.user.id })
      .sort({ purchaseDate: -1 });
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
