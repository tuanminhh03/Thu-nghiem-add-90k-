// controllers/orderController.js

import mongoose from "mongoose";
import Order from "../models/Order.js";
import Account50k from "../models/Account50k.js";
import NetflixAccount from "../models/NetflixAccount.js";
import Customer from "../models/Customer.js";

/** Determine whether the current MongoDB topology supports transactions. */
function supportsTransactions() {
  try {
    const client = mongoose.connection.getClient
      ? mongoose.connection.getClient()
      : mongoose.connection.client;
    const type =
      client?.topology?.description?.type ||
      client?.topology?.s?.description?.type; // fallback for some driver versions
    // Transactions: ReplicaSetWithPrimary, ReplicaSetNoPrimary, Sharded, LoadBalanced
    return ["ReplicaSetWithPrimary", "ReplicaSetNoPrimary", "Sharded", "LoadBalanced"].includes(type);
  } catch {
    return false;
  }
}

/** Start a session and (if supported) a transaction. */
async function startTransactionSession() {
  const session = await mongoose.startSession();
  let hasTransaction = false;
  if (supportsTransactions()) {
    try {
      session.startTransaction();
      hasTransaction = true;
    } catch (err) {
      console.warn("Transactions not supported, continuing without transaction:", err.message);
      if (session.inTransaction?.()) {
        try {
          await session.abortTransaction();
        } catch {}
      }
    }
  }
  return { session, hasTransaction };
}

/** Helper: end session safely */
async function endSessionSafe(session, hasTransaction, action = "commit") {
  try {
    if (hasTransaction) {
      if (action === "commit") await session.commitTransaction();
      else if (action === "abort") await session.abortTransaction();
    }
  } finally {
    session.endSession();
  }
}

// =============== Gói Tiết Kiệm (GTK) ==================
export const localSavings = async (req, res) => {
  try {
    const { amount, duration = "1 tháng", plan = "Gói tiết kiệm" } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Chưa đăng nhập" });
    }
    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0) {
      return res.status(400).json({ success: false, message: "Số tiền không hợp lệ" });
    }

    const customer = await Customer.findById(userId);
    if (!customer) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (customer.amount < amountNum) {
      return res.status(400).json({ success: false, message: "Số dư không đủ" });
    }

    customer.amount -= amountNum;
    await customer.save();

    const newOrder = await Order.create({
      user: userId,
      plan,
      orderCode: `GTK${Date.now()}`,
      duration,
      amount: amountNum,
      status: "PAID",
      purchaseDate: new Date(),
    });

    return res.json({
      success: true,
      message: "Mua gói tiết kiệm thành công",
      order: newOrder,
      balance: customer.amount,
    });
  } catch (err) {
    console.error("localSavings error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =============== Gói Cao Cấp (GCC) ==================
export const createOrder = async (req, res) => {
  const { session, hasTransaction } = await startTransactionSession();
  try {
    const sessionOpts = hasTransaction ? { session } : {};
    const { plan, duration, amount } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      await endSessionSafe(session, hasTransaction, "abort");
      return res.status(401).json({ success: false, message: "Chưa đăng nhập" });
    }
    if (!plan || !duration || amount === undefined) {
      await endSessionSafe(session, hasTransaction, "abort");
      return res.status(400).json({ success: false, message: "Thiếu dữ liệu đơn hàng" });
    }

    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0) {
      await endSessionSafe(session, hasTransaction, "abort");
      return res.status(400).json({ success: false, message: "Số tiền không hợp lệ" });
    }

    // Lấy thông tin khách hàng để trừ tiền
    const customer = hasTransaction
      ? await Customer.findById(userId).session(session)
      : await Customer.findById(userId);
    if (!customer) {
      await endSessionSafe(session, hasTransaction, "abort");
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (customer.amount < amountNum) {
      await endSessionSafe(session, hasTransaction, "abort");
      return res.status(400).json({ success: false, message: "Số dư không đủ" });
    }

    // Tìm tài khoản Netflix có hồ sơ trống
    const accountQuery = NetflixAccount.findOne({
      plan: "Gói cao cấp",
      "profiles.status": "empty",
    });
    const account = hasTransaction ? await accountQuery.session(session) : await accountQuery;
    if (!account) {
      await endSessionSafe(session, hasTransaction, "abort");
      return res.status(400).json({ success: false, message: "Không còn tài khoản khả dụng" });
    }

    const profile = account.profiles.find((p) => p.status === "empty");
    if (!profile) {
      await endSessionSafe(session, hasTransaction, "abort");
      return res.status(400).json({ success: false, message: "Không còn hồ sơ trống" });
    }

    // Tính ngày hết hạn
    const purchaseDate = new Date();
    const monthsMatch = String(duration).match(/\d+/);
    const months = monthsMatch ? parseInt(monthsMatch[0], 10) : 0;
    const expiresAt = new Date(purchaseDate);
    if (months > 0) {
      expiresAt.setMonth(expiresAt.getMonth() + months);
    }

    // Trừ tiền
    customer.amount -= amountNum;
    await customer.save(sessionOpts);

    // Đánh dấu hồ sơ đã dùng
    profile.status = "used";
    profile.customerPhone = customer.phone;
    profile.purchaseDate = purchaseDate;
    profile.expirationDate = expiresAt;
    await account.save(sessionOpts);

    // Tạo đơn hàng & gán hồ sơ
    const created = await Order.create(
      [
        {
          user: userId,
          plan,
          orderCode: `GCC${Date.now()}`,
          duration,
          amount: amountNum,
          status: "PAID",
          accountEmail: account.email,
          accountPassword: account.password,
          profileId: profile.id,
          profileName: profile.name,
          pin: profile.pin,
          purchaseDate,
          expiresAt,
          history: [{ message: "Tạo đơn hàng", date: purchaseDate }],
        },
      ],
      sessionOpts
    );
    const newOrder = created[0];

    await endSessionSafe(session, hasTransaction, "commit");

    return res.json({
      success: true,
      message: "Mua gói cao cấp thành công",
      order: newOrder,
      balance: customer.amount,
      netflixAccount: {
        email: account.email,
        password: account.password,
        profileName: profile.name,
        pin: profile.pin,
      },
    });
  } catch (err) {
    console.error("createOrder error:", err);
    await endSessionSafe(session, hasTransaction, "abort");
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =============== Lấy đơn sắp hết hạn ==================
export const getExpiringOrders = async (req, res) => {
  try {
    const now = new Date();
    const threeDays = new Date(now);
    threeDays.setDate(now.getDate() + 3);

    const expiringOrders = await Order.find({
      expiresAt: { $lte: threeDays },
    })
      .sort({ expiresAt: 1 })
      .lean();

    return res.json({ success: true, data: expiringOrders });
  } catch (err) {
    console.error("getExpiringOrders error:", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// =============== Lấy tất cả tài khoản ==================
export const getAllAccounts = async (req, res) => {
  try {
    const accounts = await Account50k.find().lean();
    return res.json({ success: true, data: accounts });
  } catch (err) {
    console.error("getAllAccounts error:", err);
    return res.status(500).json({ success: false, message: "Lỗi khi lấy danh sách accounts" });
  }
};

// =============== Bán account cho khách (không qua số dư) ==================
export const sellAccount = async (req, res) => {
  const { session, hasTransaction } = await startTransactionSession();
  try {
    const sessionOpts = hasTransaction ? { session } : {};
    const { customerId } = req.body;

    if (!customerId) {
      await endSessionSafe(session, hasTransaction, "abort");
      return res.status(400).json({ success: false, message: "Thiếu customerId" });
    }

    const accountQuery = Account50k.findOne({
      $or: [{ status: "available" }, { status: { $exists: false } }, { status: null }],
    });
    const account = hasTransaction ? await accountQuery.session(session) : await accountQuery;
    if (!account) {
      await endSessionSafe(session, hasTransaction, "abort");
      return res.status(400).json({ success: false, message: "Không còn tài khoản khả dụng" });
    }

    // Tạo đơn hàng: đã xoá conflict markers và chuẩn hoá các field
    const created = await Order.create(
      [
        {
          user: customerId,
          plan: "Direct Sell",
          // Nếu Order schema có trường productId thì giữ lại, nếu không có sẽ bị bỏ qua do strict
          productId: account._id,
          orderCode: `ACC${Date.now()}`,
          duration: "N/A",
          amount: 0,
          accountEmail: account.username,
          accountPassword: account.password,
          status: "PAID",
          purchaseDate: new Date(),
        },
      ],
      sessionOpts
    );
    const newOrder = created[0];

    account.status = "in_use";
    account.lastUsed = new Date();
    await account.save(sessionOpts);

    await endSessionSafe(session, hasTransaction, "commit");

    return res.json({
      success: true,
      message: "Bán account thành công",
      order: newOrder,
      account: {
        username: account.username,
        password: account.password, // ⚠️ chỉ trả nếu thực sự cần
      },
    });
  } catch (err) {
    console.error("sellAccount error:", err);
    await endSessionSafe(session, hasTransaction, "abort");
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// =============== Lấy đơn của người dùng hiện tại ==================
export const getOrders = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Chưa đăng nhập" });
    }
    const orders = await Order.find({ user: userId }).sort({ createdAt: -1 }).lean();

    return res.json({ success: true, data: orders });
  } catch (err) {
    console.error("getOrders error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// =============== Gia hạn đơn hàng ==================
export async function extendOrder(req, res) {
  const { session, hasTransaction } = await startTransactionSession();
  try {
    const sessionOpts = hasTransaction ? { session } : {};
    const { months, amount } = req.body;
    const identifier = req.params.id || req.params.orderCode;

    const monthsInt = parseInt(months, 10);
    const amountNum = Number(amount);

    if (![1, 3, 6, 12].includes(monthsInt) || !amountNum || amountNum <= 0) {
      await endSessionSafe(session, hasTransaction, "abort");
      return res.status(400).json({ message: "Dữ liệu gia hạn không hợp lệ" });
    }

    const isObjectId =
      typeof identifier === "string" && /^[0-9a-fA-F]{24}$/.test(identifier);
    const filter = isObjectId ? { _id: identifier } : { orderCode: identifier };

    const orderQuery = Order.findOne(filter);
    const order = hasTransaction ? await orderQuery.session(session) : await orderQuery;

    if (!order) {
      await endSessionSafe(session, hasTransaction, "abort");
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    if (req.user && String(order.user) !== String(req.user.id)) {
      await endSessionSafe(session, hasTransaction, "abort");
      return res.status(403).json({ message: "Bạn không sở hữu đơn hàng này" });
    }

    if (req.user) {
      const customerQuery = Customer.findById(req.user.id);
      const customer = hasTransaction
        ? await customerQuery.session(session)
        : await customerQuery;

      if (!customer) {
        await endSessionSafe(session, hasTransaction, "abort");
        return res.status(404).json({ message: "Không tìm thấy khách hàng" });
      }
      if (customer.amount < amountNum) {
        await endSessionSafe(session, hasTransaction, "abort");
        return res.status(400).json({ message: "Số dư không đủ để gia hạn" });
      }
      customer.amount -= amountNum;
      await customer.save(sessionOpts);
    }

    const currentMonths = parseInt(order.duration, 10) || 0;
    const newTotalMonths = currentMonths + monthsInt;

    const now = new Date();
    let base = order.expiresAt
      ? new Date(order.expiresAt)
      : order.purchaseDate
      ? new Date(order.purchaseDate)
      : now;
    if (isNaN(base.getTime()) || base < now) base = now;

    const newExpiresAt = new Date(base);
    newExpiresAt.setMonth(newExpiresAt.getMonth() + monthsInt);

    order.duration = `${String(newTotalMonths).padStart(2, "0")} tháng`;
    order.expiresAt = newExpiresAt;
    order.amount = Number(order.amount || 0) + amountNum;
    order.history = order.history || [];
    order.history.push({
      date: new Date(),
      message: `Gia hạn thêm ${monthsInt} tháng (${amountNum}đ)`,
    });

    const updatedOrder = await order.save(sessionOpts);

    await endSessionSafe(session, hasTransaction, "commit");

    return res.json({ success: true, data: updatedOrder });
  } catch (err) {
    console.error("extendOrder error:", err);
    await endSessionSafe(session, hasTransaction, "abort");
    return res.status(500).json({ message: "Lỗi server khi gia hạn" });
  }
}
