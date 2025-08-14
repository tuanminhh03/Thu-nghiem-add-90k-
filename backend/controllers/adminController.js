import jwt from 'jsonwebtoken';
import Customer from '../Models/Customer.js';
import Order from '../Models/Order.js';
import NetflixAccount from '../Models/NetflixAccount.js';
import PageView from '../Models/PageView.js';
import updates from '../services/eventService.js';

export function ordersStream(req, res) {
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
}

export async function login(req, res) {
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
}

export async function getCustomers(req, res) {
  try {
    const { phone } = req.query;
    const query = phone ? { phone: new RegExp(phone, 'i') } : {};
    const customers = await Customer.find(query).sort({ createdAt: -1 });
    res.json(customers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
}

export async function getCustomer(req, res) {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Không tìm thấy user' });
    res.json(customer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
}

export async function topupCustomer(req, res) {
  let { amount } = req.body; amount = parseInt(amount, 10);
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
}

export async function deleteCustomer(req, res) {
  try {
    await Order.deleteMany({ user: req.params.id });
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Không tìm thấy user' });
    res.json({ message: 'Đã xóa user' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
}

export async function getCustomerOrders(req, res) {
  try {
    const orders = await Order.find({ user: req.params.id }).sort({ purchaseDate: -1 });
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
}

export async function getOrders(req, res) {
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
}

export async function deleteOrder(req, res) {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    res.json({ message: 'Đã xóa' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
}

export async function getNetflixAccounts(req, res) {
  try {
    const accounts = await NetflixAccount.find();
    res.json(accounts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
}

export async function createNetflixAccount(req, res) {
  try {
    const { email, password, note, plan } = req.body;
    const acc = await NetflixAccount.create({ email, password, note, plan });
    res.json(acc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
}

export async function updateNetflixAccount(req, res) {
  try {
    const { email, password, note, plan } = req.body;
    const acc = await NetflixAccount.findById(req.params.id);
    if (!acc) return res.status(404).json({ message: 'Không tìm thấy tài khoản' });

    const oldEmail = acc.email;
    if (email !== undefined) acc.email = email;
    if (password !== undefined) acc.password = password;
    if (note !== undefined) acc.note = note;
    if (plan !== undefined) acc.plan = plan;
    await acc.save();

    await Order.updateMany(
      { accountEmail: oldEmail },
      { accountEmail: acc.email, accountPassword: acc.password }
    );

    res.json(acc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
}

export async function deleteNetflixAccount(req, res) {
  try {
    const acc = await NetflixAccount.findByIdAndDelete(req.params.id);
    if (!acc) return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
    res.json({ message: 'Đã xóa' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
}

export async function deleteProfile(req, res) {
  try {
    const acc = await NetflixAccount.findById(req.params.accountId);
    if (!acc) return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
    if (acc.plan !== 'Gói cao cấp') {
      return res.status(400).json({ message: 'Chỉ áp dụng cho gói cao cấp' });
    }

    const profile = acc.profiles.find(p => p.id === req.params.profileId);
    if (!profile) return res.status(404).json({ message: 'Không tìm thấy hồ sơ' });

    profile.status = 'empty';
    profile.name = '';
    profile.pin = '';
    profile.customerPhone = undefined;
    profile.purchaseDate = undefined;
    profile.expirationDate = undefined;
    await acc.save();

    await Order.updateMany(
      { accountEmail: acc.email, profileId: profile.id },
      { status: 'EXPIRED' }
    );

    res.json({ message: 'Đã xóa hồ sơ' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
}

export async function transferProfile(req, res) {
  try {
    const { toAccountId } = req.body;
    const fromAcc = await NetflixAccount.findById(req.params.accountId);
    if (!fromAcc) return res.status(404).json({ message: 'Không tìm thấy tài khoản nguồn' });
    if (fromAcc.plan !== 'Gói cao cấp') {
      return res.status(400).json({ message: 'Chỉ áp dụng cho gói cao cấp' });
    }
    const fromProfile = fromAcc.profiles.find(p => p.id === req.params.profileId);
    if (!fromProfile) return res.status(404).json({ message: 'Không tìm thấy hồ sơ nguồn' });
    if (fromProfile.status !== 'used') {
      return res.status(400).json({ message: 'Hồ sơ nguồn đang trống' });
    }

    const toAcc = await NetflixAccount.findById(toAccountId);
    if (!toAcc) return res.status(404).json({ message: 'Không tìm thấy tài khoản đích' });
    if (toAcc.plan !== 'Gói cao cấp') {
      return res.status(400).json({ message: 'Tài khoản đích không phải gói cao cấp' });
    }
    const toProfile = toAcc.profiles.find(p => p.status === 'empty');
    if (!toProfile) {
      return res.status(400).json({ message: 'Tài khoản đích không còn hồ sơ trống' });
    }

    toProfile.status = 'used';
    toProfile.customerPhone = fromProfile.customerPhone;
    toProfile.purchaseDate = fromProfile.purchaseDate;
    toProfile.expirationDate = fromProfile.expirationDate;

    fromProfile.status = 'empty';
    fromProfile.customerPhone = undefined;
    fromProfile.purchaseDate = undefined;
    fromProfile.expirationDate = undefined;

    await fromAcc.save();
    await toAcc.save();

    await Order.updateMany(
      { accountEmail: fromAcc.email, profileId: fromProfile.id },
      {
        accountEmail: toAcc.email,
        accountPassword: toAcc.password,
        profileId: toProfile.id,
        profileName: toProfile.name,
        pin: toProfile.pin
      }
    );

    res.json({ message: 'Đã chuyển hồ sơ', toProfileId: toProfile.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
}

export async function stats(req, res) {
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

    const revenueLast30Days = days.reduce((sum, d) => sum + d.revenue, 0);

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
}
