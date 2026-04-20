import AuthButton from "@/components/auth-button";
import { saveFcmTokenToDatabase } from "@/hooks/use-fcm-token-save";
import { Ionicons } from "@expo/vector-icons";
import { getApp } from "@react-native-firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
} from "@react-native-firebase/auth";
import { getDatabase, ref, set } from "@react-native-firebase/database";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView, // Tambahkan ScrollView
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const FIREBASE_DATABASE_URL =
  process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL?.trim() || "";

export default function Register() {
  const router = useRouter();
  const [secure, setSecure] = useState(true);
  const [secureConfirm, setSecureConfirm] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // State untuk mengontrol Modal Custom
  const [modalConfig, setModalConfig] = useState({
    visible: false,
    title: "",
    message: "",
    type: "error", // 'error' atau 'success'
    onConfirm: null as (() => void) | null, // Fungsi untuk pindah halaman setelah sukses
  });

  // Fungsi untuk menampilkan Custom Alert
  const showCustomAlert = (
    title: string,
    message: string,
    type: "error" | "success" = "error",
    onConfirm?: () => void,
  ) => {
    setModalConfig({
      visible: true,
      title,
      message,
      type,
      onConfirm: onConfirm || null,
    });
  };

  const passwordsMatch = confirmPassword === "" || password === confirmPassword;

  const handleRegister = async () => {
    if (password !== confirmPassword) {
      showCustomAlert(
        "Kata sandi tidak cocok",
        "Pastikan kata sandi dan konfirmasi sama.",
        "error",
      );
      return;
    }

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();

    if (
      !trimmedEmail ||
      !trimmedPassword ||
      !trimmedFirstName ||
      !trimmedLastName
    ) {
      showCustomAlert(
        "Input belum lengkap",
        "Nama, email, dan kata sandi wajib diisi.",
        "error",
      );
      return;
    }

    try {
      const app = getApp();
      const authInstance = getAuth(app);
      const userCredential = await createUserWithEmailAndPassword(
        authInstance,
        trimmedEmail,
        trimmedPassword,
      );

      const uid = userCredential.user.uid;

      const database = FIREBASE_DATABASE_URL
        ? getDatabase(app, FIREBASE_DATABASE_URL)
        : getDatabase(app);
      await set(ref(database, `users/${uid}`), {
        email: trimmedEmail,
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        createdAt: Date.now(),
      });

      // Save FCM token for push notifications (with timeout - don't block registration)
      try {
        await saveFcmTokenToDatabase(uid);
      } catch (tokenError) {
        console.warn('⚠️ Failed to save FCM token during register (continuing anyway):', tokenError);
        // Don't throw - registration should succeed even if token save fails
      }

      console.log(
        "Register success:",
        uid,
        "databaseUrl:",
        FIREBASE_DATABASE_URL || "default",
      );

      // Munculkan alert sukses, jika ditekan tombol "Mengerti" akan lari ke /starter/login
      showCustomAlert(
        "Registrasi Berhasil",
        "Akun berhasil dibuat. Silakan login.",
        "success",
        () => router.push("/starter/login"),
      );
    } catch (e) {
      const error = e as { code?: string; message?: string };
      console.log("Register error:", error?.code, error?.message, e);
      showCustomAlert(
        "Registrasi Gagal",
        `${error?.code || "error"}: ${error?.message || "Terjadi kesalahan saat membuat akun."}`,
        "error",
      );
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

        <Text style={styles.label}>Nama Depan</Text>
        <TextInput
          placeholder="Jane"
          placeholderTextColor="#999"
          style={styles.input}
          value={firstName}
          onChangeText={setFirstName}
        />

        <Text style={styles.label}>Nama Belakang</Text>
        <TextInput
          placeholder="Doe"
          placeholderTextColor="#999"
          style={styles.input}
          value={lastName}
          onChangeText={setLastName}
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          placeholder="email@gmail.com"
          placeholderTextColor="#999"
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>Kata Sandi</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            placeholder="********"
            placeholderTextColor="#999"
            secureTextEntry={secure}
            style={styles.passwordInput}
            onChangeText={setPassword}
            value={password}
          />
          <TouchableOpacity onPress={() => setSecure(!secure)}>
            <Ionicons
              name={secure ? "eye-off-outline" : "eye-outline"}
              size={20}
              color="#888"
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Konfirmasi Kata Sandi</Text>
        <View
          style={[
            styles.passwordContainer,
            !passwordsMatch && { borderBottomColor: "red" },
          ]}
        >
          <TextInput
            placeholder="********"
            secureTextEntry={secureConfirm}
            style={styles.passwordInput}
            onChangeText={setConfirmPassword}
            value={confirmPassword}
            placeholderTextColor="#999"
          />
          <TouchableOpacity onPress={() => setSecureConfirm(!secureConfirm)}>
            <Ionicons
              name={secureConfirm ? "eye-off-outline" : "eye-outline"}
              size={20}
              color="#888"
            />
          </TouchableOpacity>
        </View>

        {!passwordsMatch && (
          <Text style={styles.errorText}>Kata sandi tidak cocok</Text>
        )}

        <View style={{ marginTop: 30 }}>
          <AuthButton
            title="Daftar"
            onPress={() => {
              handleRegister();
            }}
          />
        </View>

        <Text style={styles.signInText}>Sudah Punya Akun?</Text>
        <TouchableOpacity onPress={() => router.push("/starter/login")}>
          <Text
            style={{ color: "#1E6F9F", fontWeight: "bold", textAlign: "right" }}
          >
            Masuk
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
              onPress={() => {
                setModalConfig({ ...modalConfig, visible: false });
                // Eksekusi fungsi onConfirm jika ada (misal pindah halaman)
                if (modalConfig.onConfirm) {
                  modalConfig.onConfirm();
                }
              }}
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
    width: 180,
    height: 59,
    alignSelf: "center",
    marginBottom: 30,
  },
  label: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 18,
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
  errorText: {
    color: "red",
    fontSize: 12,
    marginTop: 4,
  },
  signInText: {
    textAlign: "right",
    fontSize: 13,
    marginTop: 20,
    color: "#555",
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
