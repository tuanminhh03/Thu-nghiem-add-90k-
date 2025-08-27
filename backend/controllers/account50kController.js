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
  try {
    await resetCookies(page);
    const parsedCookies = JSON.parse(cookies)?.cookies || [];
    await page.setCookie(...parsedCookies);

    console.log("👉 Đi tới /settings/lock...");
    await page.goto("https://www.netflix.com/settings/lock", { waitUntil: "networkidle2" });
    await sleep(2000);

    const btnCreate = await page.$('[data-uia="profile-lock-off+add-button"]');
    const btnEdit = await page.$('[data-uia="profile-lock-page+edit-button"]');
    if (btnCreate) await btnCreate.click();
    else if (btnEdit) await btnEdit.click();
    else throw new Error("❌ Không tìm thấy nút Create/Edit PIN");

    await sleep(1000);

    const confirmBtn = await page.$('[data-uia="account-mfa-button-PASSWORD+PressableListItem"]');
    if (confirmBtn) {
      await confirmBtn.click();
      await sleep(1000);

      const passInput = await page.$('[data-uia="collect-password-input-modal-entry"]');
      if (!passInput) throw new Error("❌ Không thấy ô nhập mật khẩu");

      await passInput.type(password);
      await page.keyboard.press("Enter");
      await sleep(3000);
    }
    return true;
  } catch (err) {
    console.error("checkPasswordSession error:", err);
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
    const isAlive = await checkCookieSession(page, order.accountCookies);

    if (isAlive) {
      sendStep("✅ Account vẫn hoạt động");
      res.write(`event: done\ndata: ${JSON.stringify({ message: "Tài khoản vẫn hoạt động bình thường, nếu quý khách không sử dụng được vui lòng liên hệ với CSKH để được đổi tài khoản" })}\n\n`);
      if (res.flush) res.flush();
      res.end(); // 🔑 đóng SSE stream
      await browser.close();
      return;
    }

    sendStep("❌ Cookies chết, bắt đầu tìm account thay thế...");
    let newAcc = null;

    while (true) {
      const acc = await Account50k.findOne({ status: "available" });
      if (!acc) {
        sendStep("⚠️ Hết account trong kho, dừng bảo hành");
        break;
      }

      sendStep(`👉 Đang thử account ${acc.username}...`);

      const okCookie = await checkCookieSession(page, acc.cookies);
      if (!okCookie) {
        sendStep("❌ Cookie chết, bỏ qua account này");
        await Account50k.findByIdAndDelete(acc._id);
        continue;
      }

      sendStep("🔑 Đang kiểm tra mật khẩu...");
      const okPass = await checkPasswordSession(page, acc.cookies, acc.password);

      if (okPass) {
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

    // cập nhật order
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
