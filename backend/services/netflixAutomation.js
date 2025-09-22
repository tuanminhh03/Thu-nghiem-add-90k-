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

function prepareAutomationContext(email) {
  const safeSegment = sanitizeSegment(email);
  const cacheRoot = path.resolve(backendRoot, ".netflix-cache", safeSegment);
  const userDataDir = path.join(cacheRoot, "chrome-profile");
  const cookieFile = path.join(cacheRoot, "cookies.json");
  const profileDbFile = path.join(cacheRoot, "profiles.db.json");

  ensureDir(cacheRoot);
  ensureDir(userDataDir);

  return { safeSegment, userDataDir, cookieFile, profileDbFile };
}

function spawnNetflixScript(args, { env, label = "script", capture = false, onClose } = {}) {
  const stdio = capture ? ["ignore", "pipe", "pipe"] : ["ignore", "inherit", "inherit"];
  const child = spawn(process.execPath, args, {
    env,
    stdio,
    detached: false,
  });

  let stdout = "";
  let stderr = "";

  if (capture) {
    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdout += text;
      process.stdout.write(`[netflixAutomation:${label}] ${text}`);
    });
    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(`[netflixAutomation:${label}] ${text}`);
    });
  }

  child.on("error", (err) => {
    console.error(`[netflixAutomation:${label}] Không thể khởi chạy script:`, err);
    if (typeof onClose === "function") {
      onClose({ code: null, error: err, stdout, stderr });
    }
  });

  if (typeof onClose === "function") {
    child.on("close", (code) => {
      onClose({ code, stdout, stderr });
    });
  }

  return child;
}

function buildAutomationEnv({
  email,
  password,
  extraEnv = {},
  userDataDir,
  cookieFile,
  profileDbFile,
}) {
  return {
    ...process.env,
    ...extraEnv,
    NETFLIX_EMAIL: email,
    NETFLIX_PASSWORD: password,
    ACCOUNT_PASSWORD: password,
    USER_DATA_DIR: userDataDir,
    COOKIE_FILE: cookieFile,
    PROFILE_DB_FILE: profileDbFile,
  };
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

  const { safeSegment, userDataDir, cookieFile, profileDbFile } = prepareAutomationContext(email);
  const env = buildAutomationEnv({
    email,
    password,
    extraEnv,
    userDataDir,
    cookieFile,
    profileDbFile,
  });

  const args = [scriptPath, "auto", trimmedProfile, pinString];
  if (isKids) args.push("--kids");
  if (hold) args.push("--hold");

  const child = spawnNetflixScript(args, { env, label: `auto:${safeSegment}` });

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

function hasProfileNotFound(logText = "") {
  const lower = logText.toLowerCase();
  return (
    lower.includes("không thấy hồ sơ") ||
    lower.includes("khong thay ho so") ||
    lower.includes("khong thay hồ sơ")
  );
}

export function triggerNetflixProfileRename(options = {}) {
  const {
    email,
    password,
    currentProfileName,
    newProfileName,
    pin,
    extraEnv = {},
    hold = false,
  } = options;

  const trimmedCurrent = typeof currentProfileName === "string" ? currentProfileName.trim() : "";
  const trimmedNew = typeof newProfileName === "string" ? newProfileName.trim() : "";
  const pinString = typeof pin === "number" ? String(pin).padStart(4, "0") : String(pin || "");

  if (!email || !password || !trimmedCurrent || !trimmedNew) {
    console.warn("[netflixAutomation] Thiếu dữ liệu để đổi tên hồ sơ.");
    return null;
  }

  const { safeSegment, userDataDir, cookieFile, profileDbFile } = prepareAutomationContext(email);
  const env = buildAutomationEnv({
    email,
    password,
    extraEnv,
    userDataDir,
    cookieFile,
    profileDbFile,
  });

  const args = [scriptPath, "rename", trimmedCurrent, trimmedNew];
  if (/^\d{4}$/.test(pinString)) args.push(pinString);
  if (hold) args.push("--hold");

  const child = spawnNetflixScript(args, {
    env,
    label: `rename:${safeSegment}`,
    capture: true,
    onClose: ({ code, stdout = "", stderr = "" }) => {
      if (code === 0) {
        console.info(
          `[netflixAutomation] Đã đổi tên hồ sơ ${trimmedCurrent} -> ${trimmedNew} cho ${email}`
        );
        return;
      }

      const combined = `${stdout}\n${stderr}`;
      console.warn(
        `[netflixAutomation] Đổi tên hồ sơ thất bại (mã ${code}) cho ${email}`
      );

      if (hasProfileNotFound(combined) && /^\d{4}$/.test(pinString)) {
        console.warn(
          `[netflixAutomation] Không tìm thấy hồ sơ cũ – thử tạo lại bằng auto flow...`
        );
        triggerNetflixAutomation({
          email,
          password,
          profileName: trimmedNew,
          pin: pinString,
          extraEnv,
          hold,
        });
      }
    },
  });

  return child;
}

export function triggerNetflixPinUpdate(options = {}) {
  const { email, password, profileName, pin, extraEnv = {}, hold = false } = options;

  const trimmedProfile = typeof profileName === "string" ? profileName.trim() : "";
  const pinString = typeof pin === "number" ? String(pin).padStart(4, "0") : String(pin || "");

  if (!email || !password || !trimmedProfile || !/^\d{4}$/.test(pinString)) {
    console.warn("[netflixAutomation] Thiếu dữ liệu để đổi PIN hồ sơ.");
    return null;
  }

  const { safeSegment, userDataDir, cookieFile, profileDbFile } = prepareAutomationContext(email);
  const env = buildAutomationEnv({
    email,
    password,
    extraEnv,
    userDataDir,
    cookieFile,
    profileDbFile,
  });

  const args = [scriptPath, trimmedProfile, pinString];
  if (hold) args.push("--hold");

  const child = spawnNetflixScript(args, {
    env,
    label: `pin:${safeSegment}`,
    capture: true,
    onClose: ({ code }) => {
      if (code === 0) {
        console.info(
          `[netflixAutomation] Đã cập nhật PIN cho hồ sơ ${trimmedProfile} của ${email}`
        );
      } else {
        console.warn(
          `[netflixAutomation] Đổi PIN thất bại (mã ${code}) cho ${email}`
        );
      }
    },
  });

  return child;
}
