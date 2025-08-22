let puppeteerModule;

export async function launchBrowser() {
  if (!puppeteerModule) {
    try {
      puppeteerModule = await import("puppeteer");
    } catch (err) {
      throw new Error(`Puppeteer is not installed: ${err.message}`);
    }
  }

  const puppeteer = puppeteerModule.default;
  const path = puppeteer.executablePath();
  console.log("Launching Chromium:", path);

  const browser = await puppeteer.launch({
    headless: false,
    executablePath: path,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled"
    ]
  });

  console.log("Chromium version:", await browser.version());
  return browser;
}
