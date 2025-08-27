import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  createOrder,
  localSavings,
  getOrders,
  extendOrder,
  sellAccount
} from "../controllers/orderController.js";
import { checkCookieSession } from "../services/warrantyService.js";
import Account50k from "../models/Account50k.js";
import Order from "../models/Order.js";

const router = Router();

/**
 * ==============================
 * Gói cao cấp (GCC) 
 * ==============================
 */
router.post("/", authenticate, createOrder);

/**
 * ==============================
 * Gói tiết kiệm (GTK)
 * ==============================
 */
router.post("/local-savings", authenticate, localSavings);

/**
 * ==============================
 * Bán trực tiếp account
 * ==============================
 */
router.post("/sell", sellAccount);

/**
 * ==============================
 * Orders chung
 * ==============================
 */
router.get("/", authenticate, getOrders);
router.post("/:id/extend", authenticate, extendOrder);

/**
 * ==============================
 * Bảo hành (Warranty)
 * ==============================
 */
router.post("/:id/warranty", async (req, res) => {
  try {
    const orderCode = req.params.id;

    // 1. Tìm order theo orderCode
    const order = await Order.findOne({ orderCode });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // 2. Tìm account theo email trong order
    let account = await Account50k.findOne({ username: order.accountEmail });
    if (!account) {
      return res.status(404).json({ success: false, message: "Account not found" });
    }

    // 3. Check session
    let progressLog = [];
    const pass = await checkCookieSession(
      account.cookies,
      account.username,
      account.password,
      (step) => progressLog.push(step)
    );

    // 4. Nếu account chết → gán account khác
    if (!pass) {
      account.status = "dead";
      await account.save();

      const newAccount = await Account50k.findOne({
        $or: [{ status: "available" }, { status: { $exists: false } }, { status: null }]
      });

      if (newAccount) {
        progressLog.push("replace_account");

        order.accountEmail = newAccount.username;
        order.accountPassword = newAccount.password;
        await order.save();

        newAccount.status = "in_use";
        newAccount.lastUsed = new Date();
        await newAccount.save();

        return res.json({
          success: true,
          steps: progressLog,
          status: "replaced",
          newUsername: newAccount.username,
        });
      } else {
        return res.json({
          success: false,
          steps: progressLog,
          status: "no_available_account",
        });
      }
    }

    // 5. Nếu account vẫn sống
    res.json({
      success: true,
      steps: progressLog,
      status: "active",
    });

  } catch (err) {
    console.error("Warranty error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
