import AuthButton from "@/components/auth-button";
import CustomAlert from "@/components/ui/custom-alert";
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
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { styles } from "../../features/starter/styles/register-styles";

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
    type: "error" as "error" | "success",
    onConfirm: null as (() => void) | null,
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

      await Promise.all([
        set(ref(database, `users/${uid}`), {
          email: trimmedEmail,
          firstName: trimmedFirstName,
          lastName: trimmedLastName,
          createdAt: Date.now(),
        }),
        saveFcmTokenToDatabase(uid).catch(() => {}),
      ]);

      showCustomAlert(
        "Registrasi Berhasil",
        "Akun berhasil dibuat. Silakan login.",
        "success",
        () => router.push("/starter/login"),
      );
    } catch (e) {
      const error = e as { code?: string; message?: string };
      showCustomAlert(
        "Registrasi Gagal",
        `${error?.code || "error"}: ${error?.message || "Terjadi kesalahan saat membuat akun."}`,
        "error",
      );
    }
  };

  return (
    <KeyboardAwareScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContainer}
      showsVerticalScrollIndicator={false}
      enableOnAndroid={true}
      extraScrollHeight={24}
      keyboardShouldPersistTaps="handled"
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
            onPress={handleRegister}
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

      {/* Gunakan Komponen yang sudah direusable di sini */}
      <CustomAlert
        visible={modalConfig.visible}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        buttonText="Mengerti" 
        onClose={() => setModalConfig({ ...modalConfig, visible: false })}
        onConfirm={modalConfig.onConfirm}
      />
    </KeyboardAwareScrollView>
  );
}