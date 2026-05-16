import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_OTP_ATTEMPTS,
  PasswordResetError,
  assertRateLimitAllowed,
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
} from "../server/password-reset/core.js";

const SECRET = "0123456789abcdef0123456789abcdef";

test("normalizes and validates email", () => {
  assert.equal(normalizeEmail(" USER@Example.COM "), "user@example.com");
  assert.equal(isValidEmail("user@example.com"), true);
  assert.equal(isValidEmail("bad-email"), false);
});

test("generates and validates a 6 digit OTP", () => {
  const otp = generateOtp();
  assert.match(otp, /^\d{6}$/);
  assert.equal(isValidOtp(otp), true);
  assert.equal(isValidOtp("1234"), false);
});

test("hashes OTP and reset tokens deterministically", () => {
  const otpHash = hashOtp("user@example.com", "123456", SECRET);
  assert.equal(otpHash, hashOtp(" USER@example.com ", "123456", SECRET));
  assert.notEqual(otpHash, hashOtp("user@example.com", "654321", SECRET));
  assert.equal(timingSafeEqualHex(otpHash, otpHash), true);

  const tokenHash = hashToken("token-value", SECRET);
  assert.equal(tokenHash, hashToken("token-value", SECRET));
  assert.notEqual(tokenHash, hashToken("other-token", SECRET));
});

test("generates high-entropy reset token", () => {
  const token = generateResetToken();
  assert.ok(token.length >= 40);
  assert.notEqual(token, generateResetToken());
});

test("validates password policy", () => {
  assert.equal(isValidPassword("12345"), false);
  assert.equal(isValidPassword("123456"), true);
});

test("applies request rate limit state", () => {
  const now = 100000;
  const first = nextRateLimitState(null, now);
  assert.deepEqual(first, {
    windowStartedAt: now,
    count: 1,
    lastSentAt: now,
  });

  assert.throws(
    () => assertRateLimitAllowed(first, now + 1000),
    (error) =>
      error instanceof PasswordResetError && error.code === "resend_cooldown",
  );

  assert.throws(
    () =>
      assertRateLimitAllowed(
        {
          windowStartedAt: now,
          count: MAX_OTP_ATTEMPTS,
          lastSentAt: now - 60000,
        },
        now + 61000,
      ),
    (error) =>
      error instanceof PasswordResetError && error.code === "rate_limited",
  );
});
