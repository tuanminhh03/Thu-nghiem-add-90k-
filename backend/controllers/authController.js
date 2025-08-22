import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import Customer from '../Models/Customer.js';
import updates from '../services/eventService.js';

export async function register(req, res) {
  const { name, phone, pin } = req.body;
  if (!name || !phone || !pin) {
    return res.status(400).json({ message: 'Thiếu thông tin' });
  }
  if (!/^\d{6}$/.test(pin)) {
    return res.status(400).json({ message: 'Mã PIN phải gồm 6 chữ số' });
  }

  try {
    const existing = await Customer.findOne({ phone });
    if (existing) {
      return res.status(400).json({ message: 'Số điện thoại đã được đăng ký' });
    }

    const hashed = await bcrypt.hash(pin, 10);
    const user = await Customer.create({ name, phone, pin: hashed, amount: 0 });
    const token = jwt.sign(
      { id: user._id, phone: user.phone, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.status(201).json({
      message: 'Đăng ký thành công',
      token,
      user: { id: user._id, name: user.name, phone: user.phone, amount: user.amount }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server lỗi' });
  }
}

export async function login(req, res) {
  const { phone, pin } = req.body;
  console.log("Login input:", phone, pin);

  if (!phone || !pin) {
    return res.status(400).json({ message: "Thiếu số điện thoại hoặc mã PIN" });
  }

  try {
    const user = await Customer.findOne({ phone });
    console.log("User from DB:", user);

    if (!user) {
      return res.status(404).json({ message: "Tài khoản không tồn tại" });
    }

    if (!user.pin || typeof user.pin !== "string") {
      return res.status(500).json({ message: "Tài khoản không có PIN hợp lệ trong DB" });
    }

    const ok = await bcrypt.compare(pin, user.pin);
    if (!ok) {
      return res.status(400).json({ message: "Mã PIN không chính xác" });
    }

    const token = jwt.sign(
      { id: user._id, phone: user.phone, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      token,
      user: { id: user._id, name: user.name, phone: user.phone, amount: user.amount },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
}

export async function me(req, res) {
  try {
    const user = await Customer.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy user' });
    res.json({ id: user._id, name: user.name, phone: user.phone, amount: user.amount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
}

export function stream(req, res) {
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

  const keepAlive = setInterval(() => {
    res.write(':\n\n');
  }, 30000);

  updates.on(`topup:${payload.id}`, send);

  req.on('close', () => {
    updates.off(`topup:${payload.id}`, send);
    clearInterval(keepAlive);
  });
}
