import jwt from 'jsonwebtoken';
import Customer from '../Models/Customer.js';
import Order from '../Models/Order.js';
import NetflixAccount from '../Models/NetflixAccount.js';
import PageView from '../Models/PageView.js';
import AdminLog from '../Models/AdminLog.js';
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
  const admins = [
    {
      username: process.env.ADMIN_USER,
      password: process.env.ADMIN_PASS,
      role: 'superadmin'
    },
    {
      username: process.env.STAFF_USER,
      password: process.env.STAFF_PASS,
      role: 'staff'
    }
  ].filter(a => a.username && a.password);

  const admin = admins.find(
    a => a.username === username && a.password === password
  );

  if (admin) {
    const token = jwt.sign(
      { username: admin.username, role: admin.role },
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
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;
    const query = phone ? { phone: new RegExp(phone, 'i') } : {};
    const [customers, total] = await Promise.all([
      Customer.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Customer.countDocuments(query)
    ]);
    res.json({ data: customers, total, page, pages: Math.ceil(total / limit) });
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
    await AdminLog.create({
      admin: req.admin?.username || 'unknown',
      action: 'topupCustomer',
      target: customer._id.toString()
    });
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
    await AdminLog.create({
      admin: req.admin?.username || 'unknown',
      action: 'deleteCustomer',
      target: req.params.id
    });
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
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;
    const { phone } = req.query;

    let query = {};
    if (phone) {
      const customers = await Customer.find(
        { phone: new RegExp(phone, 'i') },
        '_id'
      );
      query.user = { $in: customers.map(c => c._id) };
    }

    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ purchaseDate: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'phone'),
      Order.countDocuments(query)
    ]);

    res.json({ data: orders, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
}

export async function getOrderHistory(req, res) {
  try {
    const order = await Order.findById(req.params.id).select('history');
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    res.json({ history: order.history || [] });
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
      {
        $set: {
          accountEmail: acc.email,
          accountPassword: acc.password
        },
        $push: {
          history: {
            message: 'Cập nhật thông tin tài khoản',
            date: new Date()
          }
        }
      }
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

export async function assignProfile(req, res) {
  try {
    const { phone, expirationDate } = req.body;
    if (!phone) {
      return res.status(400).json({ message: 'Thiếu SDT khách hàng' });
    }
    const customer = await Customer.findOne({ phone });
    if (!customer) {
      return res.status(404).json({ message: 'Không tìm thấy khách hàng' });
    }

    const acc = await NetflixAccount.findById(req.params.id);
    if (!acc) return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
    if (acc.plan !== 'Gói cao cấp') {
      return res.status(400).json({ message: 'Chỉ áp dụng cho gói cao cấp' });
    }

    const profile = acc.profiles.find(p => p.status === 'empty');
    if (!profile) {
      return res.status(400).json({ message: 'Tài khoản không còn hồ sơ trống' });
    }

    const order = await Order.findOne(
      {
        user: customer._id,
        $or: [
          { accountEmail: { $exists: false } },
          { accountEmail: '' }
        ]
      }
    ).sort({ purchaseDate: -1 });

    if (!order) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng đang chờ' });
    }

    profile.status = 'used';
    profile.customerPhone = phone;
    profile.purchaseDate = new Date();
    profile.expirationDate = expirationDate ? new Date(expirationDate) : undefined;
    await acc.save();

    order.accountEmail = acc.email;
    order.accountPassword = acc.password;
    order.profileId = profile.id;
    order.profileName = profile.name;
    order.pin = profile.pin;
    if (expirationDate) order.expiresAt = new Date(expirationDate);
    order.history.push({ message: 'Cấp hồ sơ', date: new Date() });
    await order.save();

    res.json({ message: 'Đã cấp hồ sơ', profileId: profile.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
}

export async function updateProfile(req, res) {
  try {
    const acc = await NetflixAccount.findById(req.params.accountId);
    if (!acc) return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
    if (acc.plan !== 'Gói cao cấp') {
      return res.status(400).json({ message: 'Chỉ áp dụng cho gói cao cấp' });
    }

    const profile = acc.profiles.find(p => p.id === req.params.profileId);
    if (!profile) return res.status(404).json({ message: 'Không tìm thấy hồ sơ' });

    const { name, pin } = req.body;
    if (name !== undefined) profile.name = name;
    if (pin !== undefined) profile.pin = pin;
    await acc.save();

    res.json({ message: 'Đã cập nhật hồ sơ', profile });
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

    const sameAccount = fromAcc._id.equals(toAcc._id);
    const message = sameAccount
      ? 'Chuyển sang hồ sơ khác'
      : 'Đổi sang tài khoản khác';

    await Order.updateMany(
      { accountEmail: fromAcc.email, profileId: fromProfile.id },
      {
        accountEmail: toAcc.email,
        accountPassword: toAcc.password,
        profileId: toProfile.id,
        profileName: toProfile.name,
        pin: toProfile.pin,

        $push: {
          history: { message: 'Đổi sang tài khoản khác', date: new Date() }
        }

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

export async function getAdminLogs(req, res) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      AdminLog.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      AdminLog.countDocuments()
    ]);
    res.json({ data: logs, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
}
