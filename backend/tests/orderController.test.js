import mongoose from "mongoose";
import Order from "../models/Order.js";
import Account50k from "../models/Account50k.js";
import NetflixAccount from "../models/NetflixAccount.js";
import Customer from "../models/Customer.js";
import { triggerNetflixAutomation } from "../services/netflixAutomation.js";

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
@@ -135,51 +136,51 @@ export const localSavings = async (req, res) => {
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
    const { plan, duration, amount, profileName, pin, isKids } = req.body;
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

    let normalizedProfileName = "";
    let normalizedPin = "";

    if (plan === "Gói cao cấp") {
      normalizedProfileName = typeof profileName === "string" ? profileName.trim() : "";
      normalizedPin = typeof pin === "string" ? pin.trim() : "";

      if (!normalizedProfileName) {
@@ -253,52 +254,71 @@ export const createOrder = async (req, res) => {

    // Tạo đơn hàng & gán hồ sơ
    const created = await Order.create(
      [
        {
          user: userId,
          plan,
          orderCode: `GCC${Math.floor(Math.random() * 99000) + 1000}`,
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

    let automationPayload = null;
    if (plan === "Gói cao cấp") {
      automationPayload = {
        email: account.email,
        password: account.password,
        profileName: profile.name,
        pin: profile.pin,
        isKids: Boolean(isKids),
      };
    }

    await endSessionSafe(session, hasTransaction, "commit");

    if (automationPayload) {
      try {
        triggerNetflixAutomation(automationPayload);
      } catch (automationErr) {
        console.error("Không thể khởi chạy auto Netflix:", automationErr);
      }
    }

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


// =============== Lấy tất cả tài khoản ==================
export const getAllAccounts = async (req, res) => {
  try {
    const accounts = await Account50k.find().lean();
    return res.json({ success: true, data: accounts });