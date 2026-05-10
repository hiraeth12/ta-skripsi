import { styles } from "../../features/starter/styles/login-styles";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";

import AuthButton from "@/components/auth-button";
import { saveFcmTokenToDatabase } from "@/hooks/use-fcm-token-save";
import { getApp } from "@react-native-firebase/app";
import {
    getAuth,
    signInWithEmailAndPassword,
} from "@react-native-firebase/auth";

export default function Login() {
  const router = useRouter();
  const [secure, setSecure] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State untuk mengontrol Modal Custom
  const [modalConfig, setModalConfig] = useState({
    visible: false,
    title: "",
    message: "",
    type: "error", // Bisa 'error' atau 'success'
  });

  // Fungsi untuk menampilkan Custom Alert
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

    if (!trimmedEmail || !trimmedPassword) {
      showCustomAlert(
        "Input belum lengkap",
        "Email dan kata sandi wajib diisi.",
        "error",
      );
      return;
    }

    setIsSubmitting(true);
    const startedAt = Date.now();

    try {
      const app = getApp();
      const authInstance = getAuth(app);
      const result = await signInWithEmailAndPassword(
        authInstance,
        trimmedEmail,
        trimmedPassword,
      );
      
      // Save FCM token for push notifications (with timeout - don't block navigation)
      if (result.user?.uid) {
        try {
          await saveFcmTokenToDatabase(result.user.uid);
        } catch {
          // Don't throw - login should succeed even if token save fails
        }
      }
      
      router.replace("/starter/ask-location");
    } catch (e) {
      const error = e as { code?: string; message?: string };
      showCustomAlert(
        "Login gagal",
        "Periksa email/kata sandi dan koneksi internet, lalu coba lagi.",
        "error",
      );
    } finally {
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
          onChangeText={setEmail}
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
          <Text
            style={{ color: "#1E6F9F", fontWeight: "bold", textAlign: "right" }}
          >
            Daftar
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Komponen Modal Alert Kustom */}
      <Modal
        visible={modalConfig.visible}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.infoCard}>
            <Ionicons
              name={
                modalConfig.type === "error"
                  ? "alert-circle"
                  : "checkmark-circle"
              }
              size={50}
              color={modalConfig.type === "error" ? "#D9534F" : "#1E6F9F"}
              style={styles.modalIcon}
            />
            <Text style={styles.infoTitle}>{modalConfig.title}</Text>
            <Text style={styles.infoDesc}>{modalConfig.message}</Text>
            <TouchableOpacity
              style={styles.infoButton}
              onPress={() => setModalConfig({ ...modalConfig, visible: false })}
            >
              <Text style={styles.infoButtonText}>Mengerti</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
