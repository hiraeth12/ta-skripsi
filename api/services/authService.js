import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase";

// Login function
export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password,
    );

    return {
      success: true,
      user: userCredential.user,
    };
  } catch (error) {
    let message = "Terjadi kesalahan";

    if (error.code === "auth/user-not-found") {
      message = "User tidak ditemukan";
    } else if (error.code === "auth/wrong-password") {
      message = "Password salah";
    } else if (error.code === "auth/invalid-email") {
      message = "Format email tidak valid";
    }

    return {
      success: false,
      error: message,
    };
  }
};
