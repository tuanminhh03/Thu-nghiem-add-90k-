import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { EventEmitter } from 'events';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import Customer from './Models/Customer.js';
import Order from './Models/Order.js';
import NetflixAccount from './Models/NetflixAccount.js';
import PageView from './Models/PageView.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env') });

const app = express();
const updates = new EventEmitter();
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

/** 2. Lấy thông tin user hiện tại */
app.get('/api/auth/me', authenticate, async (req, res) => {
  try {
    const user = await Customer.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy user' });
    res.json({ id: user._id, phone: user.phone, amount: user.amount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

/** SSE: lắng nghe cập nhật số dư */
app.get('/api/auth/stream', (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(401).end();

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).end();
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = data => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Gửi ping định kỳ để giữ kết nối SSE tránh bị timeout
  const keepAlive = setInterval(() => {
    res.write(':\n\n');
  }, 30000);

  const onTopup = payload2 => send(payload2);
  updates.on(`topup:${payload.id}`, onTopup);

  req.on('close', () => {
    updates.off(`topup:${payload.id}`, onTopup);
    clearInterval(keepAlive);
  });
});

/** SSE: cập nhật đơn hàng cho admin */
app.get('/api/admin/orders/stream', (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(401).end();

  try {
    jwt.verify(token, process.env.JWT_SECRET + '_ADMIN');
  } catch {
    return res.status(401).end();
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Ping keep-alive cho kết nối SSE
  const keepAliveAdmin = setInterval(() => {
    res.write(':\n\n');
  }, 30000);

  const onOrder = order => {
    res.write(`data: ${JSON.stringify(order)}\n\n`);
  };
  updates.on('new-order', onOrder);

  req.on('close', () => {
    updates.off('new-order', onOrder);
    clearInterval(keepAliveAdmin);
  });
});

/** 3. Tạo đơn hàng (customer thanh toán – trừ tiền) */
app.post('/api/orders', authenticate, async (req, res) => {
  const { plan, duration, amount } = req.body;
  if (!plan || !duration || !amount) {
    return res.status(400).json({ message: 'Thiếu dữ liệu đơn hàng' });
  }
  try {
    const acc = await NetflixAccount.findOne({ 'profiles.status': 'empty' });
    if (!acc) {
      return res.status(400).json({ message: 'Hết tài khoản khả dụng' });
    }

    const profile = acc.profiles.find(p => p.status === 'empty');
    profile.status = 'used';
    profile.customerEmail = req.user.phone;
    profile.purchaseDate = new Date();
    await acc.save();

    const order = await Order.create({
      user: req.user.id,
      plan,
      duration,
      amount,
      status: 'PAID',
      accountEmail: acc.email,
      accountPassword: acc.password,
      profileId: profile.id
    });
    await Customer.findByIdAndUpdate(
      req.user.id,
      { $inc: { amount: -amount } }
    );

    // Emit version có populated user để dashboard admin xem thông tin phone
    const full = await Order.findById(order._id).populate('user', 'phone');
    updates.emit('new-order', full);

    res.status(201).json({
      order,
      netflixAccount: {
        email: acc.email,
        password: acc.password,
        profileId: profile.id
      }
    });
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

    // Cũng emit bản full populated để dashboard admin cập nhật
    const full = await Order.findById(order._id).populate('user', 'phone');
    updates.emit('new-order', full);

    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Ghi nhận lượt truy cập web
app.post('/api/visit', async (req, res) => {
  try {
    await PageView.create({ path: req.body?.path || '/' });
    res.json({ message: 'OK' });
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
    updates.emit(`topup:${customer._id}`, { amount: customer.amount, added: amount });
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

// Lấy danh sách đơn hàng mới nhất
app.get('/api/admin/orders', authenticateAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const orders = await Order.find()
      .sort({ purchaseDate: -1 })
      .limit(limit)
      .populate('user', 'phone');
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Quản lý tài khoản Netflix + hồ sơ
app.get('/api/admin/netflix-accounts', authenticateAdmin, async (req, res) => {
  try {
    const accounts = await NetflixAccount.find();
    res.json(accounts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

app.post('/api/admin/netflix-accounts', authenticateAdmin, async (req, res) => {
  try {
    const { email, password, note } = req.body;
    const acc = await NetflixAccount.create({ email, password, note });
    res.json(acc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

app.put('/api/admin/netflix-accounts/:id', authenticateAdmin, async (req, res) => {
  try {
    const { email, password, note } = req.body;
    const acc = await NetflixAccount.findByIdAndUpdate(
      req.params.id,
      { email, password, note },
      { new: true }
    );
    if (!acc) return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
    res.json(acc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

app.delete('/api/admin/netflix-accounts/:id', authenticateAdmin, async (req, res) => {
  try {
    const acc = await NetflixAccount.findByIdAndDelete(req.params.id);
    if (!acc) return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
    res.json({ message: 'Đã xóa' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

app.post('/api/admin/netflix-accounts/:id/assign', authenticateAdmin, async (req, res) => {
  try {
    const { email, expirationDate } = req.body;
    const acc = await NetflixAccount.findById(req.params.id);
    if (!acc) return res.status(404).json({ message: 'Không tìm thấy tài khoản' });

    const profile = acc.profiles.find(p => p.status === 'empty');
    if (!profile) return res.status(400).json({ message: 'Hết hồ sơ trống' });

    profile.status = 'used';
    profile.customerEmail = email;
    profile.purchaseDate = new Date();
    if (expirationDate) {
      profile.expirationDate = new Date(expirationDate);
    }

    await acc.save();
    res.json(acc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Thống kê tổng quan cho Dashboard
app.get('/api/admin/stats', authenticateAdmin, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date();
    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);

    const [customerCount, revenueAgg, visitAgg, visitsToday] = await Promise.all([
      Customer.countDocuments(),
      Order.aggregate([
        { $match: { purchaseDate: { $gte: start } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$purchaseDate' } },
            total: { $sum: '$amount' }
          }
        }
      ]),
      PageView.aggregate([
        { $match: { createdAt: { $gte: start } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            total: { $sum: 1 }
          }
        }
      ]),
      PageView.countDocuments({ createdAt: { $gte: today } })
    ]);

    const days = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      days.push({ date: key, revenue: 0, visits: 0 });
    }
    const revMap = Object.fromEntries(revenueAgg.map(r => [r._id, r.total]));
    const visitMap = Object.fromEntries(visitAgg.map(v => [v._id, v.total]));
    days.forEach(d => {
      d.revenue = revMap[d.date] || 0;
      d.visits = visitMap[d.date] || 0;
    });

    const revenueLast30Days = days.reduce((s, d) => s + d.revenue, 0);

    res.json({
      customerCount,
      revenueLast30Days,
      visitsToday,
      revenueChart: days.map(d => ({ date: d.date, total: d.revenue })),
      visitChart: days.map(d => ({ date: d.date, total: d.visits }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
