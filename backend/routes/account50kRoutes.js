import express from "express";
import {
  importAccounts,
  getAccounts,
  getAccountById,
  createAccount,
  updateAccount,   
  deleteAccount,
  sellAccount,
  buyAccountGTK,
  startWarranty
} from "../controllers/account50kController.js";
import { authenticate } from "../middleware/auth.js";
import { tvLogin } from "../controllers/account50kController.js";

const router = express.Router();

// router.post("/warranty", authenticate, startWarranty);
router.get("/warranty", authenticate, startWarranty);
router.post("/bulk", importAccounts);
router.get("/", getAccounts);
router.post("/", createAccount);
router.put("/:id", updateAccount);
router.delete("/:id", deleteAccount);

router.put("/:id/sell", sellAccount);

router.post("/buy", authenticate, buyAccountGTK);

router.get("/:id", getAccountById);
router.post("/:orderId/tv-login", authenticate, tvLogin);

export default router;
