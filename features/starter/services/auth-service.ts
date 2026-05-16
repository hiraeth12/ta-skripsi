const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/+$/, "");

export class PasswordResetApiError extends Error {
  code?: string;
  status?: number;

  constructor(message: string, code?: string, status?: number) {
    super(message);
    this.name = "PasswordResetApiError";
    this.code = code;
    this.status = status;
  }
}

async function postPasswordReset<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error("EXPO_PUBLIC_API_BASE_URL belum dikonfigurasi");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new PasswordResetApiError(
      data?.error || "Permintaan reset kata sandi gagal. Silakan coba lagi.",
      data?.code,
      response.status,
    );
  }

  return data as T;
}

export const sendResetOtp = async (email: string): Promise<boolean> => {
  try {
    await postPasswordReset("/auth/password-reset/request", {
      email: email.trim().toLowerCase(),
    });
  } catch (error) {
    if (
      error instanceof PasswordResetApiError &&
      error.code === "resend_cooldown"
    ) {
      return true;
    }

    throw error;
  }

  return true;
};

export const verifyOtpCode = async (
  email: string,
  otp: string
): Promise<string> => {
  const data = await postPasswordReset<{ resetToken: string }>(
    "/auth/password-reset/verify",
    {
      email: email.trim().toLowerCase(),
      otp,
    },
  );

  if (!data.resetToken) {
    throw new Error("Token reset password tidak diterima");
  }

  return data.resetToken;
};

export const resetPasswordWithToken = async (
  email: string,
  token: string,
  newPassword: string,
): Promise<boolean> => {
  await postPasswordReset("/auth/password-reset/confirm", {
    email: email.trim().toLowerCase(),
    resetToken: token,
    newPassword,
  });

  return true;
};
