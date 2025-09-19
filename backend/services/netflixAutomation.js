import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "..");
const scriptPath = path.resolve(backendRoot, "scripts", "loginByCookie.js");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function sanitizeSegment(input) {
  return String(input || "netflix")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "netflix";
}

export function triggerNetflixAutomation(options = {}) {
  const {
    email,
    password,
    profileName,
    pin,
    isKids = false,
    hold = false,
    extraEnv = {},
  } = options;

  const pinString = typeof pin === "number" ? String(pin).padStart(4, "0") : String(pin || "");
  const trimmedProfile = typeof profileName === "string" ? profileName.trim() : "";

  if (!email || !password || !trimmedProfile || !/^\d{4}$/.test(pinString)) {
    console.warn("[netflixAutomation] Thiếu dữ liệu cần thiết, bỏ qua auto Netflix.");
    return null;
  }

  const safeSegment = sanitizeSegment(email);
  const cacheRoot = path.resolve(backendRoot, ".netflix-cache", safeSegment);
  const userDataDir = path.join(cacheRoot, "chrome-profile");
  const cookieFile = path.join(cacheRoot, "cookies.json");
  const profileDbFile = path.join(cacheRoot, "profiles.db.json");

  ensureDir(cacheRoot);
  ensureDir(userDataDir);

  const args = [scriptPath, "auto", trimmedProfile, pinString];
  if (isKids) args.push("--kids");
  if (hold) args.push("--hold");

  const child = spawn(process.execPath, args, {
    env: {
      ...process.env,
      ...extraEnv,
      NETFLIX_EMAIL: email,
      NETFLIX_PASSWORD: password,
      ACCOUNT_PASSWORD: password,
      USER_DATA_DIR: userDataDir,
      COOKIE_FILE: cookieFile,
      PROFILE_DB_FILE: profileDbFile,
    },
    stdio: ["ignore", "inherit", "inherit"],
    detached: false,
  });

  child.on("error", (err) => {
    console.error("[netflixAutomation] Không thể khởi chạy script:", err);
  });

  child.on("close", (code) => {
    if (code === 0) {
      console.info(
        "[netflixAutomation] Hoàn tất auto Netflix cho",
        email,
        "profile",
        trimmedProfile
      );
    } else {
      console.warn(
        `[netflixAutomation] Script kết thúc với mã ${code} cho ${email}`
      );
    }
  });

  return child;
}
