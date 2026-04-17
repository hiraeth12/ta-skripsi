import { getApp } from "@react-native-firebase/app";
import { getAuth, signInWithEmailAndPassword } from "@react-native-firebase/auth";

// Cache auth instance untuk menghindari re-initialization
let authInstance: ReturnType<typeof getAuth> | null = null;

export function getAuthInstance() {
  if (!authInstance) {
    try {
      const app = getApp();
      authInstance = getAuth(app);
    } catch (error) {
      console.error("Failed to get auth instance:", error);
      throw error;
    }
  }
  return authInstance;
}

// Login dengan timeout untuk mencegah hanging
export async function loginWithTimeout(
  email: string,
  password: string,
  timeoutMs: number = 10000
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const auth = getAuthInstance();
    const result = await signInWithEmailAndPassword(auth, email, password);
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Validasi email & password offline dulu (lebih cepat)
export function validateCredentials(
  email: string,
  password: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!email || email.trim().length === 0) {
    errors.push("Email harus diisi");
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("Format email tidak valid");
  }

  if (!password || password.trim().length === 0) {
    errors.push("Kata sandi harus diisi");
  } else if (password.length < 6) {
    errors.push("Kata sandi minimal 6 karakter");
  }

  return { valid: errors.length === 0, errors };
}
