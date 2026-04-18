import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import AuthButton from "@/components/auth-button";
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
      await signInWithEmailAndPassword(
        authInstance,
        trimmedEmail,
        trimmedPassword,
      );
      console.log("Login success in ms:", Date.now() - startedAt);
      router.replace("/starter/ask-location");
    } catch (e) {
      const error = e as { code?: string; message?: string };
      console.log("Login error:", error?.code, error?.message, e);
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EDEDED",
  },
  scrollContainer: {
    padding: 24,
    justifyContent: "center",
    minHeight: "100%",
  },
  image: {
    width: 250,
    height: 80,
    alignSelf: "center",
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 30,
    textAlign: "center",
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    paddingVertical: 8,
    color: "#111",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 8,
    color: "#111",
  },
  label: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 18,
  },
  forgotPassword: {
    textAlign: "right",
    color: "#1E6F9F",
    fontSize: 13,
    marginTop: 20,
    marginBottom: 10,
  },
  signUpText: {
    textAlign: "right",
    fontSize: 13,
    marginTop: 20,
    color: "#000000",
  },

  // --- Styles untuk Modal Custom ---
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "85%",
    padding: 24,
  },
  modalIcon: {
    alignSelf: "center",
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 12,
  },
  infoDesc: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  infoButton: {
    backgroundColor: "#1E6F9F",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  infoButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
