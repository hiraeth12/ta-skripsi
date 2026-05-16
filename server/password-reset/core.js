import crypto from "crypto";

export const OTP_TTL_MS = 10 * 60 * 1000;
export const RESET_TOKEN_TTL_MS = 10 * 60 * 1000;
export const MAX_OTP_ATTEMPTS = 5;
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const RATE_LIMIT_MAX_REQUESTS = 5;
export const RESEND_COOLDOWN_MS = 30 * 1000;

export class PasswordResetError extends Error {
  constructor(statusCode, message, code = "password_reset_error") {
    super(message);
    this.name = "PasswordResetError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

export function isValidOtp(otp) {
  return /^\d{6}$/.test(String(otp || "").trim());
}

export function isValidPassword(password) {
  return typeof password === "string" && password.length >= 6;
}

export function generateOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

export function generateResetToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function requireSecret(secret) {
  if (!secret || String(secret).trim().length < 32) {
    throw new PasswordResetError(
      500,
      "OTP_HASH_SECRET belum dikonfigurasi dengan benar.",
      "missing_otp_hash_secret",
    );
  }
  return String(secret);
}

export function hashOtp(email, otp, secret) {
  return crypto
    .createHmac("sha256", requireSecret(secret))
    .update(`${normalizeEmail(email)}:${String(otp).trim()}`)
    .digest("hex");
}

export function hashToken(token, secret) {
  return crypto
    .createHmac("sha256", requireSecret(secret))
    .update(String(token || ""))
    .digest("hex");
}

export function emailRateLimitKey(email, secret) {
  return crypto
    .createHmac("sha256", requireSecret(secret))
    .update(normalizeEmail(email))
    .digest("hex");
}

export function timingSafeEqualHex(left, right) {
  if (
    typeof left !== "string" ||
    typeof right !== "string" ||
    left.length !== right.length
  ) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
  } catch {
    return false;
  }
}

export function assertRateLimitAllowed(rateLimit, now = Date.now()) {
  if (!rateLimit) {
    return;
  }

  const windowStartedAt = Number(rateLimit.windowStartedAt || 0);
  const lastSentAt = Number(rateLimit.lastSentAt || 0);
  const count = Number(rateLimit.count || 0);
  const inCurrentWindow = now - windowStartedAt < RATE_LIMIT_WINDOW_MS;

  if (lastSentAt && now - lastSentAt < RESEND_COOLDOWN_MS) {
    throw new PasswordResetError(
      429,
      "Mohon tunggu sebelum meminta kode baru.",
      "resend_cooldown",
    );
  }

  if (inCurrentWindow && count >= RATE_LIMIT_MAX_REQUESTS) {
    throw new PasswordResetError(
      429,
      "Terlalu banyak permintaan. Silakan coba lagi nanti.",
      "rate_limited",
    );
  }
}

export function nextRateLimitState(rateLimit, now = Date.now()) {
  const windowStartedAt = Number(rateLimit?.windowStartedAt || 0);
  const count = Number(rateLimit?.count || 0);

  if (!windowStartedAt || now - windowStartedAt >= RATE_LIMIT_WINDOW_MS) {
    return {
      windowStartedAt: now,
      count: 1,
      lastSentAt: now,
    };
  }

  return {
    windowStartedAt,
    count: count + 1,
    lastSentAt: now,
  };
}
