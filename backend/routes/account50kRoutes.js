import express from "express";
import {
  importAccounts,
  Accountsget,       // Kho trống
  getAccountById,
  createAccount,
  updateAccount,
  deleteAccount,
  sellAccount,
  buyAccountGTK,
  startWarranty,
  getOrders,         // Đơn hàng đã bán
  tvLogin,
  switchAccount,
  updateOrderExpiration
} from "../controllers/account50kController.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

/* ========== ORDERS (Đơn hàng) ========== */
router.get("/orders", getOrders);
router.get("/warranty", authenticate, startWarranty);
router.post("/buy", authenticate, buyAccountGTK);
router.post("/:orderId/tv-login", authenticate, tvLogin);
router.put("/orders/:id/expiration", updateOrderExpiration);

/* ========== ACCOUNTS (Kho trống) ========== */
router.get("/", Accountsget);
router.post("/bulk", importAccounts);
router.post("/", createAccount);
router.get("/:id", getAccountById);
router.put("/:id", updateAccount);
router.delete("/:id", deleteAccount);
router.put("/:id/sell", sellAccount);
router.post("/orders/:orderId/switch", switchAccount);

export default router;
