// backend/server.js
import express  from 'express';
import cors     from 'cors';
import mongoose from 'mongoose';
import jwt      from 'jsonwebtoken';
import dotenv   from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import Customer       from './Models/Customer.js';
import Order          from './Models/Order.js';
import NetflixAccount from './Models/NetflixAccount.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env') });

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

// Middleware xác thực admin
function authenticateAdmin(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Không có token' });
  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET + '_ADMIN');
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

/** Gia hạn đơn hàng */
app.post('/api/orders/:id/extend', authenticate, async (req, res) => {
  const { months, amount } = req.body;
  const monthsInt = parseInt(months, 10);
  if (![1, 3, 6, 12].includes(monthsInt) || !amount) {
    return res.status(400).json({ message: 'Dữ liệu gia hạn không hợp lệ' });
  }
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user.id });
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

    const customer = await Customer.findById(req.user.id);
    if (!customer || customer.amount < amount) {
      return res.status(400).json({ message: 'Số dư không đủ' });
    }

    const current = parseInt(order.duration, 10) || 0;
    const total = current + monthsInt;

    order.duration = `${total.toString().padStart(2, '0')} tháng`;
    order.amount += amount;
    await order.save();

    customer.amount -= amount;
    await customer.save();

    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

/** ====== ADMIN ROUTES ====== */

// Admin login
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (
    username === process.env.ADMIN_USER &&
    password === process.env.ADMIN_PASS
  ) {
    const token = jwt.sign(
      { username },
      process.env.JWT_SECRET + '_ADMIN',
      { expiresIn: '7d' }
    );
    res.json({ token });
  } else {
    res.status(401).json({ message: 'Sai thông tin đăng nhập' });
  }
});

// Lấy danh sách customers (có thể tìm kiếm theo phone)
app.get('/api/admin/customers', authenticateAdmin, async (req, res) => {
  try {
    const { phone } = req.query;
    const query = phone ? { phone: new RegExp(phone, 'i') } : {};
    const customers = await Customer.find(query).sort({ createdAt: -1 });
    res.json(customers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Lấy thông tin 1 customer
app.get('/api/admin/customers/:id', authenticateAdmin, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Không tìm thấy user' });
    res.json(customer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Nạp tiền cho customer
app.post('/api/admin/customers/:id/topup', authenticateAdmin, async (req, res) => {
  let { amount } = req.body;
  amount = parseInt(amount, 10);
  if (!amount || amount <= 0) {
    return res.status(400).json({ message: 'Số tiền không hợp lệ' });
  }

  try {
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { $inc: { amount } },
      { new: true }
    );
    if (!customer) return res.status(404).json({ message: 'Không tìm thấy user' });
    res.json(customer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Xóa customer
app.delete('/api/admin/customers/:id', authenticateAdmin, async (req, res) => {
  try {
    await Order.deleteMany({ user: req.params.id });
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Không tìm thấy user' });
    res.json({ message: 'Đã xóa user' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Lấy lịch sử mua hàng của customer
app.get('/api/admin/customers/:id/orders', authenticateAdmin, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.params.id }).sort({ purchaseDate: -1 });
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Placeholder quản lý tài khoản Netflix
app.get('/api/admin/netflix-accounts', authenticateAdmin, async (req, res) => {
  try {
    const accs = await NetflixAccount.find();
    res.json(accs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
