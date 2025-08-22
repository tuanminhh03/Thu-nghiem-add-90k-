import puppeteer from "puppeteer";

export async function launchBrowser() {
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
