import Account50k from "../models/Account50k.js";
import Order from "../models/Order.js";
import Customer from '../models/Customer.js';
import bcrypt from 'bcrypt';
import { launchBrowser } from "../utils/puppeteerLauncher.js";
import { sleep } from "../utils/sleep.js";

const warrantyTasks = new Map();

const resetCookies = async (page) => {
  try {
    const current = await page.cookies();
    if (current.length) await page.deleteCookie(...current);
  } catch {}
};

export const checkCookieSession = async (page, cookies) => {
  try {
    await resetCookies(page);
    const parsedCookies = JSON.parse(cookies)?.cookies || [];
    await page.setCookie(...parsedCookies);

    console.log("👉 Đi tới /changeplan...");
    await page.goto("https://www.netflix.com/changeplan", { waitUntil: "networkidle2" });
    console.log("✅ URL hiện tại:", page.url());

    return page.url().includes("/changeplan");
  } catch (err) {
    console.error("checkCookieSession error:", err);
    return false;
  }
};
export const checkPasswordSession = async (page, cookies, password) => {
  // config
  const LOCK_URL = "https://www.netflix.com/settings/lock";
  const CREATE_SEL = '[data-uia="profile-lock-off+add-button"]';
  const EDIT_SEL = '[data-uia="profile-lock-page+edit-button"]';
  const CONFIRM_SEL = '[data-uia="account-mfa-button-PASSWORD+PressableListItem"]';
  const PASS_INPUT_SEL = '[data-uia="collect-password-input-modal-entry"]';
  const SUCCESS_RE = /\/settings\/lock\/pinentry/i; // case-insensitive
  const TIMEOUTS = { goto: 30000, first: 12000, input: 12000, final: 20000, grace: 7000 };

  // helper: wait for URL match (regex source string passed)
  const waitForUrlMatch = async (page, regexSource, timeoutMs) => {
    try {
      await page.waitForFunction(
        (re) => new RegExp(re, "i").test(window.location.href),
        { timeout: timeoutMs, polling: 300 },
        regexSource
      );
      return true;
    } catch {
      return false;
    }
  };

  try {
    // reset & set cookies
    await resetCookies(page);
    let parsed = [];
    try { parsed = JSON.parse(cookies)?.cookies || []; } catch (e) { parsed = []; }
    if (parsed.length) await page.setCookie(...parsed);

    console.log("👉 checkPasswordSession: goto", LOCK_URL);
    await page.goto(LOCK_URL, { waitUntil: "networkidle2", timeout: TIMEOUTS.goto });

    // quick pre-check: nếu URL đã ở trang pinentry thì ok luôn
    const currentUrl = page.url();
    if (SUCCESS_RE.test(currentUrl)) {
      console.log("✅ checkPasswordSession: already on pinentry (pre-check).");
      return true;
    }

    // click Create or Edit (nếu có)
    const btnCreate = await page.$(CREATE_SEL);
    const btnEdit = await page.$(EDIT_SEL);
    if (btnCreate) {
      console.log("👉 click Create PIN");
      await btnCreate.click();
    } else if (btnEdit) {
      console.log("👉 click Edit PIN");
      await btnEdit.click();
    } else {
      console.log("⚠️ Không thấy Create/Edit button - will try URL recheck");
      // có thể trang đã redirect khác, nhanh re-check
      if (await waitForUrlMatch(page, SUCCESS_RE.source, 3000)) {
        console.log("✅ checkPasswordSession: detected pinentry after missing button");
        return true;
      }
      throw new Error("Không tìm thấy nút Create/Edit PIN");
    }

    // --- RACE: chờ confirm button xuất hiện *hoặc* redirect thẳng sang pinentry ---
    const pConfirm = page.waitForSelector(CONFIRM_SEL, { timeout: TIMEOUTS.first }).then(() => "confirm").catch(() => null);
    const pUrl     = waitForUrlMatch(page, SUCCESS_RE.source, TIMEOUTS.first).then(ok => ok ? "url" : null);

    const first = await Promise.race([pConfirm, pUrl]);

    if (first === "url") {
      console.log("✅ checkPasswordSession: redirected to pinentry immediately after click (race).");
      return true;
    }

    if (first !== "confirm") {
      // neither confirm nor url happened in the time window
      console.log("⚠️ confirm button not found and no redirect (first wait). Doing one more short recheck.");
      if (await waitForUrlMatch(page, SUCCESS_RE.source, 3000)) {
        console.log("✅ checkPasswordSession: detected pinentry on short recheck.");
        return true;
      }
      console.log("❌ confirm button missing - cannot proceed to password input.");
      return false;
    }

    // we have confirm button
    console.log("👉 Found confirm button, clicking it...");
    const confirmBtn = await page.$(CONFIRM_SEL);
    if (!confirmBtn) {
      console.log("❌ confirmBtn disappeared after race - abort");
      return false;
    }
    await confirmBtn.click();

    // RACE: chờ input mật khẩu xuất hiện OR (rare) redirect to pinentry
    const pPassInput = page.waitForSelector(PASS_INPUT_SEL, { timeout: TIMEOUTS.input }).then(() => "input").catch(() => null);
    const pUrl2      = waitForUrlMatch(page, SUCCESS_RE.source, TIMEOUTS.input).then(ok => ok ? "url" : null);

    const second = await Promise.race([pPassInput, pUrl2]);

    if (second === "url") {
      console.log("✅ checkPasswordSession: redirected to pinentry after confirm (no password input needed).");
      return true;
    }

    if (second !== "input") {
      console.log("❌ Không thấy ô nhập mật khẩu sau confirm (second wait). Final recheck for URL.");
      if (await waitForUrlMatch(page, SUCCESS_RE.source, 5000)) {
        console.log("✅ checkPasswordSession: detected pinentry on final recheck.");
        return true;
      }
      return false;
    }

    // we have the password input -> type + submit
    console.log("👉 Typing password into input...");
    const passInput = await page.$(PASS_INPUT_SEL);
    if (!passInput) {
      console.log("❌ passInput element disappeared - abort");
      return false;
    }
    await passInput.type(password, { delay: 50 });
    await page.keyboard.press("Enter");

    // After submit: wait for URL match (final wait). If not, grace poll.
    const finalOk = await waitForUrlMatch(page, SUCCESS_RE.source, TIMEOUTS.final);
    if (finalOk) {
      console.log("✅ Pass đúng, redirect về pinentry (final wait).");
      return true;
    }

    // grace recheck loop - đôi khi redirect hơi muộn
    console.log("⏳ Final wait failed - doing grace recheck for", TIMEOUTS.grace, "ms");
    const start = Date.now();
    while (Date.now() - start < TIMEOUTS.grace) {
      if (SUCCESS_RE.test(page.url())) {
        console.log("✅ Pass đúng (grace recheck).");
        return true;
      }
      await page.waitForTimeout(300);
    }

    // cuối cùng: không thấy redirect → pass coi là sai
    console.log("❌ Không redirect về pinentry → pass sai hoặc hành vi khác.");
    return false;
  } catch (err) {
    console.error("checkPasswordSession error:", err && err.message ? err.message : err);
    return false;
  }
};

export const switchAccount = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng" });

    const browser = await launchBrowser();
    const page = await browser.newPage();

    let newAcc = null;

    // Duyệt qua các acc khả dụng trong kho
    const candidates = await Account50k.find({ status: "available" });
    for (const acc of candidates) {
      const okCookie = await checkCookieSession(page, acc.cookies);
      if (!okCookie) {
        await Account50k.findByIdAndDelete(acc._id);
        continue;
      }

      const okPass = await checkPasswordSession(page, acc.cookies, acc.password);
      if (okPass) {
        newAcc = acc;
        await Account50k.findByIdAndDelete(acc._id);
        break;
      } else {
        await Account50k.findByIdAndDelete(acc._id);
      }
    }

    await browser.close();

    if (!newAcc) {
      return res.status(400).json({ success: false, message: "Không còn account khả dụng để chuyển" });
    }

    // Cập nhật Order với acc mới
    order.accountEmail = newAcc.username;
    order.accountPassword = newAcc.password;
    order.accountCookies = newAcc.cookies;
    order.history.push({ message: "Được cấp tài khoản mới qua chức năng chuyển", date: new Date() });
    await order.save();

    res.json({ success: true, message: "Đã chuyển thành công", data: order });
  } catch (err) {
    console.error("switchAccount error:", err);
    res.status(500).json({ success: false, message: "Lỗi server khi chuyển account" });
  }
};

export const startWarranty = async (req, res) => {
  try {
    const { orderId } = req.query;  
    if (!orderId)
      return res.status(400).json({ success: false, message: "Thiếu orderId" });

    const order = await Order.findById(orderId);
    if (!order)
      return res.status(404).json({ success: false, message: "Không tìm thấy order" });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    if (res.flushHeaders) res.flushHeaders(); // 🔑 đảm bảo header gửi ngay

    const sendStep = (msg) => {
      console.log(`[Warranty] ${msg}`);
      res.write(`event: progress\ndata: ${JSON.stringify({ message: msg })}\n\n`);
      if (res.flush) res.flush();
    };

    const browser = await launchBrowser();
    const page = await browser.newPage();

    // ========== BẮT ĐẦU ==========
    sendStep("🔄 Đang kiểm tra tài khoản cũ ...");

    // 1) Kiểm tra cookie tài khoản cũ
    const okCookie = await checkCookieSession(page, order.accountCookies);

    if (okCookie) {
      // 2) Nếu cookie sống thì kiểm tra thêm mật khẩu
      sendStep("🔑 Đang kiểm tra mật khẩu tài khoản cũ...");
      const okPass = await checkPasswordSession(page, order.accountCookies, order.accountPassword);

      if (okPass) {
        // ✅ Cookie + Pass đúng → tài khoản đang sống → return ngay
        sendStep("✅ Tài khoản hiện tại hợp lệ (cookie + password)");
        res.write(`event: done\ndata: ${JSON.stringify({ 
          message: "Tài khoản vẫn hoạt động bình thường, nếu quý khách không sử dụng được vui lòng liên hệ CSKH để được hỗ trợ"
        })}\n\n`);
        if (res.flush) res.flush();
        res.end();
        await browser.close();
        return;
      } else {
        sendStep("❌ Mật khẩu sai/không vào được trang PIN → cần tìm account thay thế...");
      }
    } else {
      sendStep("❌ Cookies chết → bắt đầu tìm account thay thế...");
    }

    let newAcc = null;

    while (true) {
      const acc = await Account50k.findOne({ status: "available" });
      if (!acc) {
        sendStep("⚠️ Hết account trong kho, dừng bảo hành");
        break;
      }

      sendStep(`👉 Đang thử account ${acc.username}...`);

      const okCookie2 = await checkCookieSession(page, acc.cookies);
      if (!okCookie2) {
        sendStep("❌ Cookie chết, bỏ qua account này");
        await Account50k.findByIdAndDelete(acc._id);
        continue;
      }

      sendStep("🔑 Đang kiểm tra mật khẩu...");
      const okPass2 = await checkPasswordSession(page, acc.cookies, acc.password);

      if (okPass2) {
        sendStep("✅ Tìm thấy account hợp lệ");
        newAcc = acc;
        await Account50k.findByIdAndDelete(acc._id);
        break;
      } else {
        sendStep("❌ Mật khẩu sai, bỏ qua account này");
        await Account50k.findByIdAndDelete(acc._id);
      }
    }

    if (!newAcc) {
      res.write(`event: done\ndata: ${JSON.stringify({ message: "Không còn account khả dụng ❌" })}\n\n`);
      if (res.flush) res.flush();
      res.end();
      await browser.close();
      return;
    }

    // 4) Cập nhật order với acc mới
    order.accountEmail = newAcc.username;
    order.accountPassword = newAcc.password;
    order.accountCookies = newAcc.cookies;
    order.history.push({ message: "Được cấp tài khoản bảo hành mới", date: new Date() });
    await order.save();

    sendStep("✅ Bảo hành thành công");
    res.write(`event: done\ndata: ${JSON.stringify({ message: "Bảo hành thành công" })}\n\n`);
    if (res.flush) res.flush();
    res.end();
    await browser.close();
  } catch (err) {
    console.error("warrantyAccount error:", err);
    res.write(`event: done\ndata: ${JSON.stringify({ message: "Lỗi bảo hành ❌" })}\n\n`);
    if (res.flush) res.flush();
    res.end();
  }
};

// =========================
// Account50k Controller
// =========================

export const createAccount = async (req, res) => {
  try {
    const { username, password, cookies } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: "Thiếu username hoặc password" });
    }

    const existing = await Account50k.findOne({ username });
    if (existing) {
      return res.status(400).json({ success: false, message: "Account đã tồn tại" });
    }

    const account = new Account50k({ username, password, cookies, status: "available" });
    await account.save();

    res.json({ success: true, data: account });
  } catch (err) {
    console.error("createAccount error:", err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};


export const importAccounts = async (req, res) => {
  try {
    const accounts = req.body.accounts; // [{ username, password, cookies }, ...]

    if (!accounts || !Array.isArray(accounts)) {
      return res.status(400).json({ success: false, message: "Dữ liệu không hợp lệ" });
    }

    // Lọc bỏ account trùng username
    const usernames = accounts.map((a) => a.username);
    const existing = await Account50k.find({ username: { $in: usernames } }).select("username");
    const existingSet = new Set(existing.map((e) => e.username));

    const toInsert = accounts.filter((a) => !existingSet.has(a.username));
    if (toInsert.length === 0) {
      return res.json({ success: true, message: "Tất cả account đã tồn tại", inserted: 0 });
    }

    await Account50k.insertMany(toInsert);
    res.json({ success: true, message: "Import thành công", inserted: toInsert.length });
  } catch (err) {
    console.error("importAccounts error:", err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

/**
 * Lấy danh sách accounts
 */
export const Accountsget = async (req, res) => {
  try {
    const accounts = await Account50k.find({ status: "available" }).sort({ createdAt: -1 });
    res.json({ success: true, data: accounts });
  } catch (err) {
    console.error("getAccounts error:", err);
    res.status(500).json({ success: false, message: "Lỗi server khi lấy accounts" });
  } 
};

export const getOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "name phone") // nếu cần thêm info khách
      .sort({ purchaseDate: -1 });

    res.json({ success: true, data: orders });
  } catch (err) {
    console.error("getOrders error:", err);
    res.status(500).json({ success: false, message: "Lỗi server khi lấy orders" });
  }
};;


/**
 * Lấy account theo id
 */
export const getAccountById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'Thiếu id' });

    const account = await Account50k.findById(id).select('-__v');
    if (!account) return res.status(404).json({ success: false, message: 'Không tìm thấy account' });

    res.json({ success: true, data: account });
  } catch (err) {
    console.error('getAccountById error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

/**
 * Xóa 1 account theo id
 */
export const deleteAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Account50k.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Không tìm thấy account" });
    }
    res.json({ success: true, message: "Xóa account thành công" });
  } catch (err) {
    console.error("deleteAccount error:", err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};
export const getExpiringOrders = async (req, res) => {
  try {
    const now = new Date();
    const threeDays = new Date();
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

export const sellAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const { phone, planDays } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, message: "Thiếu số điện thoại khách hàng" });
    }

    const account = await Account50k.findById(id);
    if (!account) {
      return res.status(404).json({ success: false, message: "Không tìm thấy account" });
    }

    // Tạo khách hàng mới nếu số điện thoại chưa đăng ký
    let customer = await Customer.findOne({ phone });
    if (!customer) {
      const hashed = await bcrypt.hash('000000', 10);
      customer = await Customer.create({ name: 'Khách mới', phone, pin: hashed });
    }

    const now = new Date();
    const expirationDate = new Date();
    expirationDate.setDate(now.getDate() + (planDays || 30));

    account.phone = phone;
    account.purchaseDate = now;
    account.expirationDate = expirationDate;
    account.status = "in_use";
    await account.save();

    const months = Math.floor((planDays || 30) / 30);
    const amount = months * 50000;

    await Order.create({
      user: customer._id,
      plan: "Gói tiết kiệm",
      orderCode: `ADGTK${Math.floor(Math.random() * 10000)}`,
      duration: `${months} tháng`,
      amount,
      accountEmail: account.username,
      accountPassword: account.password,
      accountCookies: account.cookies,
      status: "PAID",
      purchaseDate: now,
      expiresAt: expirationDate,
      history: [
        {
          message: `Bán trực tiếp ${months} tháng (${amount}đ)`,
          date: now,
        },
      ],
    });

    res.json({ success: true, message: "Bán account thành công", data: account });
  } catch (err) {
    console.error("sellAccount error:", err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};
export const updateAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const { password, cookies, expirationDate } = req.body;

    const account = await Account50k.findById(id);
    if (!account) {
      return res.status(404).json({ success: false, message: "Không tìm thấy account" });
    }

    if (password) account.password = password;
    if (cookies) account.cookies = cookies;
    if (expirationDate) account.expirationDate = new Date(expirationDate);

    await account.save();
    res.json({ success: true, message: "Cập nhật account thành công", data: account });
  } catch (err) {
    console.error("updateAccount error:", err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

export const buyAccountGTK = async (req, res) => {
  try {
    const { planDays, amount } = req.body;
    const userId = req.user.id;

    // 1. Lấy khách hàng
    const customer = await Customer.findById(userId);
    if (!customer) {
      return res.status(404).json({ success: false, message: "Không tìm thấy khách hàng" });
    }

    // 2. Check số dư
    if (customer.amount < amount) {
      return res.status(400).json({ success: false, message: "Số dư không đủ để mua gói này" });
    }

    // 3. Tìm account khả dụng
    const acc = await Account50k.findOne({ status: "available" });
    if (!acc) {
      return res.status(400).json({ success: false, message: "Hết tài khoản để bán" });
    }

    // 4. Trừ tiền user
    customer.amount -= amount;
    if (!customer.name) {
      customer.name = "Khách mới";
    }
    await customer.save();

    // 5. Tạo Order mới
    const order = await Order.create({
      user: userId,
      plan: "Gói tiết kiệm",
      orderCode: `GTK${Math.floor(Math.random() * 10000)}`,
      duration: `${Math.floor(planDays / 30)} tháng`,
      amount,
      accountEmail: acc.username,
      accountPassword: acc.password,
      accountCookies: acc.cookies, // ✅ lưu cookie để bảo hành
      status: "PAID",
      purchaseDate: new Date(),
      expiresAt: new Date(Date.now() + planDays * 24 * 60 * 60 * 1000),
      history: [
        {
          message: `Mua mới ${Math.floor(planDays / 30)} tháng (${amount}đ)`,
          date: new Date(),
        },
      ],
    });

    // 6. Xóa account đã bán khỏi bảng account50ks
    await Account50k.findByIdAndDelete(acc._id);

    // 7. Trả response
    res.json({
      success: true,
      data: {
        order,
        updatedUser: customer,
      },
    });
  } catch (err) {
    console.error("buyAccountGTK error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

function priceForDays(days) {
  if (days >= 365) return 500000;
  if (days >= 180) return 270000;
  if (days >= 90) return 140000;
  return 50000;
}

export const tvLogin = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { tvCode } = req.body;

    if (!orderId || !tvCode) {
      return res
        .status(400)
        .json({ success: false, message: "Thiếu orderId hoặc mã TV" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy đơn hàng" });
    }

    const browser = await launchBrowser();
    const page = await browser.newPage();

    try {
      // Gán cookies từ DB vào trình duyệt
      const parsedCookies = JSON.parse(order.accountCookies)?.cookies || [];
      if (parsedCookies.length > 0) {
        await page.setCookie(...parsedCookies);
      }

      await page.goto("https://www.netflix.com/tv8", {
        waitUntil: "networkidle2",
        timeout: 30000,
      });

      // đợi trang load xong
      await new Promise(r => setTimeout(r, 2000));

      // tìm 8 ô input
      const inputs = await page.$$("input.pin-number-input");
      if (!inputs || inputs.length !== 8) {
        throw new Error("Không tìm thấy đủ 8 ô nhập mã TV");
      }

      // nhập từng ký tự của mã
      for (let i = 0; i < 8; i++) {
        await inputs[i].click();
        await inputs[i].type(tvCode[i]);
      }

      // nhấn Enter sau khi nhập xong
      await page.keyboard.press("Enter");
      await new Promise(r => setTimeout(r, 4000));

      const url = page.url();
      if (url.includes("browse")) {
        res.json({ success: true, message: "✅ TV login thành công" });
      } else {
        res.status(400).json({ success: false, message: "❌ TV login thất bại" });
      }
    } finally {
      await browser.close();
    }
  } catch (err) {
    console.error("tvLogin error:", err);
    res.status(500).json({ success: false, message: "Lỗi server khi TV login" });
  }
};

// Thêm vào cuối file account50kController.js
export const updateOrderExpiration = async (req, res) => {
  try {
    const { id } = req.params;
    const { expirationDate } = req.body;

    const order = await Order.findByIdAndUpdate(
      id,
      { expiresAt: new Date(expirationDate) },
      { new: true }
    );

    if (!order) return res.status(404).json({ success: false, message: "Không tìm thấy order" });
    res.json({ success: true, data: order });
  } catch (err) {
    console.error("updateOrderExpiration error:", err);
    res.status(500).json({ success: false, message: "Lỗi server khi cập nhật hạn order" });
  }
};

export { Accountsget as getAllAccounts };
