export const sendResetOtp = async (email: string): Promise<boolean> => {
  return new Promise((resolve) => setTimeout(() => resolve(true), 1000));
};

export const verifyOtpCode = async (
  email: string,
  otp: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Simulate checking OTP (accept any length 4 string for now)
      if (otp.length === 4) {
        resolve("mock-reset-token-12345");
      } else {
        reject(new Error("OTP salah"));
      }
    }, 1000);
  });
};

export const resetPasswordWithToken = async (
  email: string,
  token: string,
  newPassword: string
): Promise<boolean> => {
  return new Promise((resolve) => setTimeout(() => resolve(true), 1000));
};
