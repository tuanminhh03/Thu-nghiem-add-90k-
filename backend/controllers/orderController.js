import Customer from '../Models/Customer.js';
import Order from '../Models/Order.js';
import NetflixAccount from '../Models/NetflixAccount.js';
import updates from '../services/eventService.js';

export async function createOrder(req, res) {
  const { plan, duration, amount } = req.body;
  if (!plan || !duration || !amount) {
    return res.status(400).json({ message: 'Thiếu dữ liệu đơn hàng' });
  }

  try {
    const acc = await NetflixAccount.findOne({ plan, 'profiles.status': 'empty' });
    if (!acc) {
      return res.status(400).json({ message: 'Hết tài khoản khả dụng' });
    }

    const profile = acc.profiles.find(p => p.status === 'empty');
    const purchaseDate = new Date();
    const monthsInt = parseInt(duration, 10) || 0;
    const expiresAt = new Date(purchaseDate);
    expiresAt.setMonth(expiresAt.getMonth() + monthsInt);

    profile.status = 'used';
    profile.customerPhone = req.user.phone;
    profile.purchaseDate = purchaseDate;
    profile.expirationDate = expiresAt;
    await acc.save();

    const prefix = plan === 'Gói cao cấp' ? 'GCC' : 'GTK';
    const count = await Order.countDocuments({ plan });

    const order = await Order.create({
      user: req.user.id,
      plan,
      orderCode: `${prefix}${count + 1}`,
      duration,
      amount,
      status: 'PAID',
      accountEmail: acc.email,
      accountPassword: acc.password,
      profileId: profile.id,
      profileName: profile.name,
      pin: profile.pin,
      purchaseDate,
      expiresAt
    });

    await Customer.findByIdAndUpdate(req.user.id, { $inc: { amount: -amount } });

    const full = await Order.findById(order._id).populate('user', 'phone');
    updates.emit('new-order', full);

    res.status(201).json({
      order,
      netflixAccount: {
        email: acc.email,
        password: acc.password,
        profileId: profile.id,
        profileName: profile.name,
        pin: profile.pin
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi tạo đơn hàng' });
  }
}

export async function getOrders(req, res) {
  try {
    const orders = await Order
      .find({ user: req.user.id })
      .sort({ purchaseDate: 1 });
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
}

export async function extendOrder(req, res) {
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
    order.duration = `${(current + monthsInt).toString().padStart(2, '0')} tháng`;
    order.amount += amount;

    const purchaseDate = order.purchaseDate || new Date();
    const expiresAt = new Date(purchaseDate);
    expiresAt.setMonth(expiresAt.getMonth() + (current + monthsInt));
    order.expiresAt = expiresAt;
    await order.save();

    customer.amount -= amount;
    await customer.save();

    if (order.profileId) {
      await NetflixAccount.updateOne(
        { 'profiles.id': order.profileId },
        { $set: { 'profiles.$.expirationDate': expiresAt } }
      );
    }

    const full = await Order.findById(order._id).populate('user', 'phone');
    updates.emit('new-order', full);

    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
}

export async function localSavings(req, res) {
  let { amount } = req.body; amount = parseInt(amount, 10);
  if (!amount || amount <= 0) {
    return res.status(400).json({ message: 'Số tiền không hợp lệ' });
  }
  try {
    await Customer.findByIdAndUpdate(req.user.id, { $inc: { amount: -amount } });
    const user = await Customer.findById(req.user.id, 'phone amount');
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
}
