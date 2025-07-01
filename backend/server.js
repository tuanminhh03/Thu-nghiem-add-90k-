// backend/server.js
import express  from 'express';
import cors     from 'cors';
import mongoose from 'mongoose';
import jwt      from 'jsonwebtoken';
import dotenv   from 'dotenv';
import Customer from './models/Customer.js';
import Order    from './models/Order.js';
import bcrypt   from 'bcrypt';
import Admin    from './models/Admin.js';

dotenv.config();

const app = express();
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('🗄️  MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

// --- middleware xác thực chung ---
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

// --- middleware chỉ dành cho Admin ---
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Chỉ admin mới có quyền' });
  }
  next();
}

// --- User login/register bằng phone ---
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
      user: {
        id:     user._id,
        phone:  user.phone,
        amount: user.amount || 0
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server lỗi' });
  }
});

// --- Admin login bằng username/password ---
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

// --- Xóa customer (tuỳ bạn có dùng) ---
app.delete('/customers/:id', async (req, res) => {
  try {
    await Customer.findByIdAndDelete(req.params.id);
    res.json({ message: 'Xóa thành công' });
  } catch {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// --- Route chỉ dành cho Admin: lấy danh sách all customers ---
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

// --- Route trả về Orders của user hiện tại ---
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

// --- Route tạo order mới (khi xử lý thanh toán) ---
app.post('/api/orders', authenticate, async (req, res) => {
  const { plan, duration, amount } = req.body;
  if (!plan || !duration || !amount) {
    return res.status(400).json({ message: 'Thiếu dữ liệu đơn hàng' });
  }
  try {
    const order = await Order.create({
      user:     req.user.id,
      plan,
      duration,
      amount,
      status:   'PAID'
    });
    // Cộng số tiền vào account customer
    await Customer.findByIdAndUpdate(req.user.id, { $inc: { amount } });
    res.status(201).json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi tạo đơn hàng' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
