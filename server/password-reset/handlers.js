import {
  MAX_OTP_ATTEMPTS,
  OTP_TTL_MS,
  PasswordResetError,
  RESET_TOKEN_TTL_MS,
  assertRateLimitAllowed,
  emailRateLimitKey,
  generateOtp,
  generateResetToken,
  hashOtp,
  hashToken,
  isValidEmail,
  isValidOtp,
  isValidPassword,
  nextRateLimitState,
  normalizeEmail,
  timingSafeEqualHex,
} from "./core.js";
import { sendOtpEmail } from "./email.js";

const GENERIC_REQUEST_RESPONSE = {
  ok: true,
  message: "Jika email terdaftar, kode verifikasi akan dikirim.",
};

function getSecret() {
  return process.env.OTP_HASH_SECRET;
}

function invalidOtp(code = "invalid_otp") {
  return new PasswordResetError(400, "OTP salah atau kedaluwarsa.", code);
}

async function getUserByEmailOrNull(auth, email) {
  try {
    return await auth.getUserByEmail(email);
  } catch (error) {
    if (error?.code === "auth/user-not-found") {
      return null;
    }
    throw error;
  }
}

async function updateRateLimit(db, email, now) {
  const key = emailRateLimitKey(email, getSecret());
  const ref = db.ref(`password_reset_rate_limits/${key}`);
  const snapshot = await ref.get();
  const current = snapshot.val();

  assertRateLimitAllowed(current, now);

  await ref.set(nextRateLimitState(current, now));
}

export async function requestPasswordReset({ auth, db }, body) {
  const email = normalizeEmail(body?.email);
  const now = Date.now();

  if (!isValidEmail(email)) {
    throw new PasswordResetError(400, "Format email tidak valid.", "invalid_email");
  }

  await updateRateLimit(db, email, now);

  const user = await getUserByEmailOrNull(auth, email);
  if (!user) {
    return GENERIC_REQUEST_RESPONSE;
  }

  const otp = generateOtp();
  const otpRef = db.ref(`password_reset_otps/${user.uid}`);

  await otpRef.set({
    otpHash: hashOtp(email, otp, getSecret()),
    email,
    expiresAt: now + OTP_TTL_MS,
    attempts: 0,
    used: false,
    createdAt: now,
    lastSentAt: now,
  });

  try {
    await sendOtpEmail(email, otp);
  } catch (error) {
    await otpRef.remove();
    throw new PasswordResetError(
      502,
      "Gagal mengirim email OTP.",
      "email_delivery_failed",
    );
  }

  return GENERIC_REQUEST_RESPONSE;
}

export async function verifyPasswordResetOtp({ auth, db }, body) {
  const email = normalizeEmail(body?.email);
  const otp = String(body?.otp || "").trim();
  const now = Date.now();

  if (!isValidEmail(email) || !isValidOtp(otp)) {
    throw invalidOtp("invalid_otp_format");
  }

  const user = await getUserByEmailOrNull(auth, email);
  if (!user) {
    throw invalidOtp("invalid_otp_user");
  }

  const otpRef = db.ref(`password_reset_otps/${user.uid}`);
  const snapshot = await otpRef.get();
  const record = snapshot.val();

  if (!record || record.email !== email) {
    throw invalidOtp("invalid_otp_not_found");
  }

  if (record.used) {
    throw invalidOtp("otp_already_used");
  }

  if (Number(record.expiresAt || 0) < now) {
    throw invalidOtp("otp_expired");
  }

  if (Number(record.attempts || 0) >= MAX_OTP_ATTEMPTS) {
    throw invalidOtp("otp_attempts_exceeded");
  }

  const candidateHash = hashOtp(email, otp, getSecret());
  if (!timingSafeEqualHex(candidateHash, record.otpHash)) {
    await otpRef.update({
      attempts: Number(record.attempts || 0) + 1,
      lastAttemptAt: now,
    });
    throw invalidOtp("invalid_otp");
  }

  const resetToken = generateResetToken();
  const tokenHash = hashToken(resetToken, getSecret());

  await Promise.all([
    otpRef.update({
      used: true,
      usedAt: now,
    }),
    db.ref(`password_reset_tokens/${tokenHash}`).set({
      uid: user.uid,
      email,
      expiresAt: now + RESET_TOKEN_TTL_MS,
      used: false,
      createdAt: now,
    }),
  ]);

  return {
    resetToken,
  };
}

export async function confirmPasswordReset({ auth, db }, body) {
  const email = normalizeEmail(body?.email);
  const resetToken = String(body?.resetToken || "").trim();
  const newPassword = body?.newPassword;
  const now = Date.now();

  if (!isValidEmail(email) || !resetToken || !isValidPassword(newPassword)) {
    throw new PasswordResetError(
      400,
      "Data reset password tidak valid.",
      "invalid_reset_request",
    );
  }

  const user = await getUserByEmailOrNull(auth, email);
  if (!user) {
    throw new PasswordResetError(
      400,
      "Token reset password tidak valid.",
      "invalid_reset_token",
    );
  }

  const tokenHash = hashToken(resetToken, getSecret());
  const tokenRef = db.ref(`password_reset_tokens/${tokenHash}`);
  const snapshot = await tokenRef.get();
  const tokenRecord = snapshot.val();

  if (
    !tokenRecord ||
    tokenRecord.uid !== user.uid ||
    tokenRecord.email !== email ||
    tokenRecord.used ||
    Number(tokenRecord.expiresAt || 0) < now
  ) {
    throw new PasswordResetError(
      400,
      "Token reset password tidak valid.",
      "invalid_reset_token",
    );
  }

  await auth.updateUser(user.uid, {
    password: newPassword,
  });

  await Promise.all([
    tokenRef.update({
      used: true,
      usedAt: now,
    }),
    db.ref(`password_reset_otps/${user.uid}`).remove(),
  ]);

  return {
    ok: true,
  };
}
