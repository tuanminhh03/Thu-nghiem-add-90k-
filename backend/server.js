// backend/server.js
import express  from 'express';
import cors     from 'cors';
import mongoose from 'mongoose';
import jwt      from 'jsonwebtoken';
import dotenv   from 'dotenv';
import bcrypt   from 'bcrypt';

import Customer from './models/Customer.js';
import Order    from './models/Order.js';
import Admin    from './models/Admin.js';

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

/** Middleware: Kiểm tra role admin */
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Chỉ admin mới có quyền' });
  }
  next();
}

/** 1. Đăng ký/đăng nhập user bằng phone */
app.post('/api/auth/login', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ message: 'Thiếu số điện thoại' });

  try {
    let user = await Customer.findOne({ phone });
    if (!user) {
      user = await Customer.create({ phone, amount: 0, role: 'user' });
    }
    const token = jwt.sign(
      { id: user._id, phone: user.phone, role: user.role },
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

/** 2. Đăng nhập admin bằng username/password */
app.post('/api/auth/admin-login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Thiếu username hoặc password' });
  }
  try {
    const admin = await Admin.findOne({ username });
    if (!admin) return res.status(401).json({ message: 'Không tìm thấy admin' });

    const match = await bcrypt.compare(password, admin.passwordHash);
    if (!match) return res.status(401).json({ message: 'Sai mật khẩu' });

    const token = jwt.sign(
      { id: admin._id, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, admin: { username: admin.username } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
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

/** 5. Admin: Lấy danh sách tất cả customer */
app.get(
  '/api/admin/users',
  authenticate,
  requireAdmin,
  async (req, res) => {
    try {
      const users = await Customer.find().select('phone amount');
      res.json(users);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Lỗi server khi fetch users' });
    }
  }
);

/** 6. Admin: Nạp tiền cho customer */
app.post(
  '/api/admin/top-up',
  authenticate,
  requireAdmin,
  async (req, res) => {
    const { userId, amount } = req.body;
    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ message: 'Dữ liệu không hợp lệ' });
    }
    try {
      const user = await Customer.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'Không tìm thấy khách hàng' });
      }
      user.amount += amount;
      await user.save();
      res.json({ message: 'Top-up thành công', newAmount: user.amount });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Lỗi server khi nạp tiền' });
    }
  }
);

/** 7. Admin: Thống kê doanh thu theo ngày hoặc tháng */
app.get(
  '/api/admin/revenue',
  authenticate,
  requireAdmin,
  async (req, res) => {
    const { period } = req.query; // 'daily' hoặc 'monthly'
    try {
      let groupId;
      if (period === 'monthly') {
        groupId = {
          year:  { $year: '$purchaseDate' },
          month: { $month: '$purchaseDate' }
        };
      } else {
        groupId = {
          year:  { $year: '$purchaseDate' },
          month: { $month: '$purchaseDate' },
          day:   { $dayOfMonth: '$purchaseDate' }
        };
      }

      const stats = await Order.aggregate([
        { $match: { status: 'PAID' } },
        { $group: {
            _id:   groupId,
            total: { $sum: '$amount' }
        }},
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ]);

      // Format label
      const data = stats.map(item => {
        const { year, month, day } = item._id;
        const label = period === 'monthly'
          ? `${year}-${String(month).padStart(2,'0')}`
          : `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        return { label, total: item.total };
      });

      res.json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Lỗi thống kê doanh thu' });
    }
  }
);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
