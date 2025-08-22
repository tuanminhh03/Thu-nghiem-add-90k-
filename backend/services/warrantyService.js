let chromium;

async function loadChromium() {
  if (chromium) return chromium;

  try {
    ({ chromium } = await import("playwright"));
  } catch (err) {
    throw new Error(`Playwright is not installed: ${err.message}`);
  }

  return chromium;
}

/**
 * Parse cookies từ string JSON trong Mongo hoặc dạng "key=value"
 */
function parseCookies(cookiesRaw) {
  let cookies = [];

  if (!cookiesRaw) {
    throw new Error("cookiesRaw is empty or undefined");
  }

  if (typeof cookiesRaw === "string") {
    try {
      const parsed = JSON.parse(cookiesRaw);

      // Trường hợp cookiesRaw là object dạng { url, cookies: [...] }
      if (parsed.cookies && Array.isArray(parsed.cookies)) {
        cookies = parsed.cookies.map(c => ({
          name: c.name,
          value: c.value,
          domain: c.domain || ".netflix.com",
          path: c.path || "/",
          secure: c.secure ?? true,
          httpOnly: c.httpOnly ?? false
        }));
      } else {
        // fallback: chuỗi key=value;key2=value2
        cookies = cookiesRaw.split(";").map(pair => {
          const [name, value] = pair.trim().split("=");
          return { name, value, domain: ".netflix.com", path: "/" };
        });
      }
    } catch {
      // fallback: không parse được → treat as "key=value"
      cookies = cookiesRaw.split(";").map(pair => {
        const [name, value] = pair.trim().split("=");
        return { name, value, domain: ".netflix.com", path: "/" };
      });
    }
  } else if (cookiesRaw.cookies) {
    // trường hợp FE gửi object { cookies: [...] }
    cookies = cookiesRaw.cookies;
  }

  if (!cookies.length) {
    throw new Error("No cookies found after parsing");
  }

  return cookies;
}

/**
 * Kiểm tra session Netflix
 * @param {*} cookiesRaw cookies (string JSON hoặc object)
 * @param {*} username email Netflix
 * @param {*} password password Netflix
 * @param {*} onProgress callback báo bước (optional)
 * @returns true nếu pass, false nếu dead
 */
export async function checkCookieSession(cookiesRaw, username, password, onProgress) {
  let browser;
  let context;
  let result = false;

  try {
    const chromiumInstance = await loadChromium();
    browser = await chromiumInstance.launch({ headless: true });
    context = await browser.newContext();
  } catch (err) {
    console.error("[Warranty] Playwright load error:", err.message);
    return result;
  }

  try {
    const cookies = parseCookies(cookiesRaw);
    await context.addCookies(cookies);

    const page = await context.newPage();

    // Step 1: check ChangePlan
    if (onProgress) onProgress("checking_login");
    await page.goto("https://www.netflix.com/ChangePlan", {
      waitUntil: "domcontentloaded",
      timeout: 20000
    });

    const url = page.url().toLowerCase();
    if (url.includes("/account")) {
      result = false; // redirect về /account => dead
      return result;
    }
    if (!url.includes("/changeplan")) {
      result = false;
      return result;
    }

    // Step 2: check password nếu có
    if (username && password) {
      if (onProgress) onProgress("checking_password");

      await page.goto("https://www.netflix.com/settings/lock", {
        waitUntil: "domcontentloaded",
        timeout: 20000
      });
      await page.waitForTimeout(2000);

      try {
        const btnCreate = page.locator('[data-uia="profile-lock-off+add-button"]');
        const btnEdit = page.locator('[data-uia="profile-lock-page+edit-button"]');
        let editPinClicked = false;

        if (await btnCreate.count() && await btnCreate.isVisible()) {
          await btnCreate.click();
        } else if (await btnEdit.count() && await btnEdit.isVisible()) {
          await btnEdit.click();
          editPinClicked = true;
        } else {
          throw new Error("Không tìm thấy nút Create/Edit PIN");
        }

        await page.waitForTimeout(2000);

        const confirmBtn = page.locator('[data-uia="account-mfa-button-PASSWORD+PressableListItem"]');
        if (await confirmBtn.count() && await confirmBtn.isVisible()) {
          await confirmBtn.click();
        } else if (editPinClicked) {
          result = true; // edit mà không cần confirm password => coi như pass
          return result;
        } else {
          throw new Error("Không thấy nút Confirm password");
        }

        await page.waitForTimeout(2000);

        const pwdInput = page.locator('[data-uia="collect-password-input-modal-entry"]');
        if (await pwdInput.count() && await pwdInput.isVisible()) {
          await pwdInput.fill(password);
          await page.keyboard.press("Enter");
          await page.waitForTimeout(4000);
        } else {
          throw new Error("Không thấy ô nhập mật khẩu");
        }
      } catch (err) {
        console.error("[Warranty] Password check error:", err.message);
        result = false;
        return result;
      }
    }

    result = true;
  } catch (err) {
    console.error("[Warranty] checkCookieSession error:", err.message);
    result = false;
  } finally {
    if (context) await context.close();
    if (browser) await browser.close();
  }

  return result;
}
