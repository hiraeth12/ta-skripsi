import AuthButton from "@/components/ui/auth-button";
import CustomAlert from "@/components/ui/custom-alert";
import { saveFcmTokenToDatabase } from "@/utils/fcm";
import { Ionicons } from "@expo/vector-icons";
import { getApp } from "@react-native-firebase/app";
import {
    getAuth,
    signInWithEmailAndPassword,
} from "@react-native-firebase/auth";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { styles } from "../styles/login-styles";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getFirebaseAuthError(code: string | undefined): string {
  const messages: Record<string, string> = {
    "auth/invalid-credential": "Email atau kata sandi salah.",
    "auth/user-not-found": "Akun dengan email ini tidak ditemukan.",
    "auth/wrong-password": "Kata sandi salah.",
    "auth/too-many-requests": "Terlalu banyak percobaan. Coba lagi nanti.",
    "auth/network-request-failed": "Tidak ada koneksi internet.",
    "auth/user-disabled": "Akun ini telah dinonaktifkan.",
  };
  return (
    messages[code ?? ""] ??
    "Periksa email/kata sandi dan koneksi internet, lalu coba lagi."
  );
}

export default function Login() {
  const router = useRouter();
  const [secure, setSecure] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [modalConfig, setModalConfig] = useState({
    visible: false,
    title: "",
    message: "",
    type: "error" as "error" | "success",
  });

  const showCustomAlert = (
    title: string,
    message: string,
    type: "error" | "success" = "error",
  ) => {
    setModalConfig({ visible: true, title, message, type });
  };

  const handleLogin = async () => {
    if (isSubmitting) return;

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail) {
      showCustomAlert("Input Belum Lengkap", "Email wajib diisi.", "error");
      return;
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      showCustomAlert(
        "Input Tidak Valid",
        "Silakan masukkan alamat email yang valid.",
        "error",
      );
      return;
    }

    if (!trimmedPassword) {
      showCustomAlert(
        "Input Belum Lengkap",
        "Kata sandi wajib diisi.",
        "error",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const app = getApp();
      const authInstance = getAuth(app);
      const result = await signInWithEmailAndPassword(
        authInstance,
        trimmedEmail,
        trimmedPassword,
      );

      if (result.user?.uid) {
        saveFcmTokenToDatabase(result.user.uid).catch(() => {});
      }

      setIsSubmitting(false);
      router.replace("/starter/ask-location");
    } catch (e) {
      const error = e as { code?: string };
      showCustomAlert("Login Gagal", getFirebaseAuthError(error.code), "error");
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <Image
          style={styles.image}
          source={require("@/assets/images/SeismoTrack_2-removebg-preview.png")}
          resizeMode="contain"
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          placeholder="email@gmail.com"
          placeholderTextColor="#999"
          value={email}
          onChangeText={(v) => setEmail(v.trimStart())}
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
        />

        <Text style={styles.label}>Kata Sandi</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            placeholder="********"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={secure}
            autoCorrect={false}
            spellCheck={false}
            autoComplete="password"
            style={styles.passwordInput}
          />
          <TouchableOpacity onPress={() => setSecure(!secure)}>
            <Ionicons
              name={secure ? "eye-off-outline" : "eye-outline"}
              size={20}
              color="#888"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => router.push("/starter/forgot-password")}
        >
          <Text style={styles.forgotPassword}>Lupa Kata Sandi?</Text>
        </TouchableOpacity>

        <AuthButton
          title={isSubmitting ? "Memproses..." : "Login"}
          onPress={handleLogin}
          disabled={isSubmitting}
        />

        <Text style={styles.signUpText}>Belum Punya Akun?</Text>
        <TouchableOpacity onPress={() => router.push("/starter/register")}>
          <Text style={styles.registerText}>Daftar</Text>
        </TouchableOpacity>
      </ScrollView>

      <CustomAlert
        visible={modalConfig.visible}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        onClose={() => setModalConfig({ ...modalConfig, visible: false })}
      />
    </KeyboardAvoidingView>
  );
}
