// controllers/orderController.js

import Order from '../models/Order.js';
import Account50k from "../models/Account50k.js";
import Customer from "../models/Customer.js";

// =============== Gói Tiết Kiệm (GTK) ==================
export const localSavings = async (req, res) => {
  try {
    const { amount, duration = "1 tháng", plan = "Gói tiết kiệm" } = req.body;
    const userId = req.user.id;

    const customer = await Customer.findById(userId);
    if (!customer) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (customer.amount < amount) {
      return res.status(400).json({ success: false, message: "Số dư không đủ" });
    }

    customer.amount -= amount;
    await customer.save();

    const newOrder = await Order.create({
      user: userId,
      plan,
      orderCode: `GTK${Date.now()}`,
      duration,
      amount,
      status: "PAID",
    });

    res.json({
      success: true,
      message: "Mua gói tiết kiệm thành công",
      order: newOrder,
      balance: customer.amount,
    });
  } catch (err) {
    console.error("localSavings error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// =============== Gói Cao Cấp (GCC) ==================
export const createOrder = async (req, res) => {
  try {
    const { plan, duration, amount } = req.body;
    const userId = req.user.id;

    if (!plan || !duration || !amount) {
      return res.status(400).json({ success: false, message: "Thiếu dữ liệu đơn hàng" });
    }

    const account = await Account50k.findOne({
      $or: [
        { status: "available" },
        { status: { $exists: false } },
        { status: null },
      ],
    });

    if (!account) {
      return res.status(400).json({ success: false, message: "Không còn tài khoản khả dụng" });
    }

    const newOrder = await Order.create({
      user: userId,
      plan,
      orderCode: `GCC${Date.now()}`,
      duration,
      amount,
      accountEmail: account.username,
      accountPassword: account.password,
    });

    account.status = "in_use";
    account.lastUsed = new Date();
    await account.save();

    res.json({
      success: true,
      message: "Mua gói cao cấp thành công",
      order: newOrder,
      netflixAccount: {
        email: account.username,
        password: account.password,
      },
    });
  } catch (err) {
    console.error("createOrder error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// =============== Lấy đơn sắp hết hạn ==================
export const getExpiringOrders = async (req, res) => {
  try {
    const now = new Date();
    const threeDays = new Date(now);
    threeDays.setDate(now.getDate() + 3);

    const expiringOrders = await Order.find({
      expirationDate: { $lte: threeDays }
    }).lean();

    res.json({ success: true, data: expiringOrders });
  } catch (err) {
    console.error("getExpiringOrders error:", err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// =============== Lấy tất cả tài khoản ==================
export const getAllAccounts = async (req, res) => {
  try {
    const accounts = await Account50k.find().lean();
    res.json({ success: true, data: accounts });
  } catch (err) {
    console.error("getAllAccounts error:", err);
    res.status(500).json({ success: false, message: "Lỗi khi lấy danh sách accounts" });
  }
};

// =============== Bán account cho khách ==================
export const sellAccount = async (req, res) => {
  try {
    const { customerId } = req.body;

    // Lấy 1 account khả dụng
    const account = await Account50k.findOne({ status: "available" });
    if (!account) {
      return res.status(400).json({ success: false, message: "Không còn tài khoản khả dụng" });
    }

    // Gắn account vào order mới
    const newOrder = new Order({
      userId: customerId,
      productId: account._id,
      orderCode: `ACC${Date.now()}`,
      type: "SELL",
      accountId: account._id,
      accountEmail: account.username,
    });
    await newOrder.save();

    account.status = "in_use";
    account.lastUsed = new Date();
    await account.save();

    res.json({
      success: true,
      message: "Bán account thành công",
      order: newOrder,
      account: {
        username: account.username,
        password: account.password, // ⚠️ chỉ trả password nếu cần
      },
    });
  } catch (err) {
    console.error("sellAccount error:", err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

export const getOrders = async (req, res) => {
  try {
    // Tự bảo hiểm: tìm orders theo field user hoặc userId (tùy model)
    const userId = req.user.id;
    const orders = await Order.find({
      $or: [{ user: userId }, { userId: userId }]
    }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error("getOrders error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export async function extendOrder(req, res) {
  try {
    const { months, amount } = req.body;
    const identifier = req.params.id || req.params.orderCode;
    const monthsInt = parseInt(months, 10);
    const amountNum = Number(amount);

    if (![1,3,6,12].includes(monthsInt) || !amountNum || amountNum <= 0) {
      return res.status(400).json({ message: 'Dữ liệu gia hạn không hợp lệ' });
    }

    // tìm order theo id hoặc orderCode
    const isObjectId = typeof identifier === 'string' && /^[0-9a-fA-F]{24}$/.test(identifier);
    const filter = isObjectId ? { _id: identifier } : { orderCode: identifier };

    const order = await Order.findOne(filter);
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

    // quyền sở hữu (nếu có req.user)
    if (req.user && String(order.user || order.userId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Bạn không sở hữu đơn hàng này' });
    }

    // compute new total months
    const currentMonths = parseInt(order.duration, 10) || 0;
    const newTotalMonths = currentMonths + monthsInt;

    // base date: nếu expiresAt còn hiệu lực thì cộng từ đó, nếu expired thì từ now
    const now = new Date();
    let base = order.expiresAt ? new Date(order.expiresAt) : (order.purchaseDate ? new Date(order.purchaseDate) : now);
    if (isNaN(base.getTime()) || base < now) base = now;

    const newExpiresAt = new Date(base);
    newExpiresAt.setMonth(newExpiresAt.getMonth() + monthsInt); // cộng thêm monthsInt

    // NOTE: push history và set duration/expiresAt/amount
    const update = {
      $set: {
        duration: `${newTotalMonths.toString().padStart(2,'0')} tháng`,
        expiresAt: newExpiresAt
      },
      $inc: { amount: amountNum },
      $push: { history: { date: new Date(), message: `Gia hạn thêm ${monthsInt} tháng (${amountNum}đ)` } }
    };

    const updatedOrder = await Order.findOneAndUpdate(filter, update, { new: true }).lean();
    if (!updatedOrder) return res.status(500).json({ message: 'Không thể cập nhật đơn hàng' });

    // log để kiểm tra
    console.log('extendOrder updatedOrder:', updatedOrder);

    // cập nhật tiền khách (nếu dùng Customer)
    if (req.user) {
      await Customer.findByIdAndUpdate(req.user.id, { $inc: { amount: -amountNum } });
    }

    // trả về order đã cập nhật (raw)
    return res.json(updatedOrder);
  } catch (err) {
    console.error('extendOrder error:', err);
    return res.status(500).json({ message: 'Lỗi server khi gia hạn' });
  }
}