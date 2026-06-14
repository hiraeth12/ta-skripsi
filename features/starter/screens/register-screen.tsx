import AuthButton from "@/components/ui/auth-button";
import CustomAlert from "@/components/ui/custom-alert";
import { saveFcmTokenToDatabase } from "@/utils/fcm";
import { Ionicons } from "@expo/vector-icons";
import { getApp } from "@react-native-firebase/app";
import {
    createUserWithEmailAndPassword,
    getAuth,
} from "@react-native-firebase/auth";
import { getDatabase, ref, set } from "@react-native-firebase/database";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Image, Text, TextInput, TouchableOpacity, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { styles } from "../styles/register-styles";

const FIREBASE_DATABASE_URL =
  process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL?.trim() || "";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).+$/;
const MAX_NAME_LENGTH = 64;
const MAX_EMAIL_LENGTH = 254;
const MAX_PASSWORD_LENGTH = 128;

const getFirebaseErrorMessage = (code?: string): string => {
  switch (code) {
    case "auth/email-already-in-use":
      return "Email sudah terdaftar. Silakan gunakan email lain atau masuk.";
    case "auth/invalid-email":
      return "Format email tidak valid.";
    case "auth/weak-password":
      return `Kata sandi terlalu lemah. Minimal ${PASSWORD_MIN_LENGTH} karakter.`;
    case "auth/network-request-failed":
      return "Gagal terhubung ke server. Periksa koneksi internet Anda.";
    case "auth/too-many-requests":
      return "Terlalu banyak percobaan. Coba lagi beberapa saat kemudian.";
    default:
      return "Terjadi kesalahan saat membuat akun. Silakan coba lagi.";
  }
};

interface ValidationErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

const validate = (
  firstName: string,
  lastName: string,
  email: string,
  password: string,
  confirmPassword: string,
): ValidationErrors => {
  const errors: ValidationErrors = {};

  if (!firstName) {
    errors.firstName = "Nama depan tidak boleh kosong.";
  }

  if (!lastName) {
    errors.lastName = "Nama belakang tidak boleh kosong.";
  }

  if (!email) {
    errors.email = "Email tidak boleh kosong.";
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = "Format email tidak valid.";
  }

  if (!password) {
    errors.password = "Kata sandi tidak boleh kosong.";
  } else if (password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `Kata sandi minimal ${PASSWORD_MIN_LENGTH} karakter.`;
  } else if (!PASSWORD_REGEX.test(password)) {
    errors.password = "Kata sandi harus mengandung huruf dan angka.";
  }

  if (password !== confirmPassword) {
    errors.confirmPassword = "Kata sandi tidak cocok.";
  }

  return errors;
};

export default function Register() {
  const { t } = useTranslation();
  const router = useRouter();

  const [secure, setSecure] = useState(true);
  const [secureConfirm, setSecureConfirm] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [modalConfig, setModalConfig] = useState({
    visible: false,
    title: "",
    message: "",
    type: "error" as "error" | "success",
    onConfirm: null as (() => void) | null,
  });

  const trimmedFirstName = firstName.trim();
  const trimmedLastName = lastName.trim();
  const trimmedEmail = email.trim();
  const trimmedPassword = password.trim();
  const trimmedConfirm = confirmPassword.trim();

  const errors = submitted
    ? validate(
        trimmedFirstName,
        trimmedLastName,
        trimmedEmail,
        trimmedPassword,
        trimmedConfirm,
      )
    : {};

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
      onConfirm: onConfirm ?? null,
    });
  };

  const handleRegister = (
    _event: import("react-native").GestureResponderEvent,
  ): void => {
    void (async () => {
      setSubmitted(true);

      const validationErrors = validate(
        trimmedFirstName,
        trimmedLastName,
        trimmedEmail,
        trimmedPassword,
        trimmedConfirm,
      );

      if (Object.keys(validationErrors).length > 0) {
        const firstError = Object.values(validationErrors)[0]!;
        showCustomAlert("Input Tidak Valid", firstError, "error");
        return;
      }

      if (isLoading) return;
      setIsLoading(true);

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
          saveFcmTokenToDatabase(uid).catch((err) => {
            console.warn("[FCM] Gagal menyimpan token FCM:", err);
          }),
        ]);

        showCustomAlert(
          "Registrasi Berhasil",
          "Akun berhasil dibuat. Silakan login.",
          "success",
          () => router.push("/starter/login"),
        );
      } catch (e) {
        const error = e as { code?: string };
        showCustomAlert(
          "Registrasi Gagal",
          getFirebaseErrorMessage(error?.code),
          "error",
        );
      } finally {
        setIsLoading(false);
      }
    })();
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
        style={[styles.input, errors.firstName && { borderBottomColor: "red" }]}
        value={firstName}
        onChangeText={setFirstName}
        maxLength={MAX_NAME_LENGTH}
        autoCapitalize="words"
      />
      {errors.firstName && (
        <Text style={styles.errorText}>{errors.firstName}</Text>
      )}

      <Text style={styles.label}>Nama Belakang</Text>
      <TextInput
        placeholder="Doe"
        placeholderTextColor="#999"
        style={[styles.input, errors.lastName && { borderBottomColor: "red" }]}
        value={lastName}
        onChangeText={setLastName}
        maxLength={MAX_NAME_LENGTH}
        autoCapitalize="words"
      />
      {errors.lastName && (
        <Text style={styles.errorText}>{errors.lastName}</Text>
      )}

      <Text style={styles.label}>{t("registerScreen.emailLabel")}</Text>
      <TextInput
        placeholder="email@gmail.com"
        placeholderTextColor="#999"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        style={[styles.input, errors.email && { borderBottomColor: "red" }]}
        value={email}
        onChangeText={setEmail}
        maxLength={MAX_EMAIL_LENGTH}
      />
      {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

      <Text style={styles.label}>{t("registerScreen.passwordLabel")}</Text>
      <View
        style={[
          styles.passwordContainer,
          errors.password && { borderBottomColor: "red" },
        ]}
      >
        <TextInput
          placeholder="Min. 8 karakter"
          placeholderTextColor="#999"
          secureTextEntry={secure}
          style={styles.passwordInput}
          onChangeText={setPassword}
          value={password}
          maxLength={MAX_PASSWORD_LENGTH}
        />
        <TouchableOpacity onPress={() => setSecure((v) => !v)}>
          <Ionicons
            name={secure ? "eye-off-outline" : "eye-outline"}
            size={20}
            color="#888"
          />
        </TouchableOpacity>
      </View>
      {errors.password && (
        <Text style={styles.errorText}>{errors.password}</Text>
      )}

      <Text style={styles.label}>{t("registerScreen.confirmPasswordLabel")}</Text>
      <View
        style={[
          styles.passwordContainer,
          errors.confirmPassword && { borderBottomColor: "red" },
        ]}
      >
        <TextInput
          placeholder="********"
          placeholderTextColor="#999"
          secureTextEntry={secureConfirm}
          style={styles.passwordInput}
          onChangeText={setConfirmPassword}
          value={confirmPassword}
          maxLength={MAX_PASSWORD_LENGTH}
        />
        <TouchableOpacity onPress={() => setSecureConfirm((v) => !v)}>
          <Ionicons
            name={secureConfirm ? "eye-off-outline" : "eye-outline"}
            size={20}
            color="#888"
          />
        </TouchableOpacity>
      </View>
      {errors.confirmPassword && (
        <Text style={styles.errorText}>{errors.confirmPassword}</Text>
      )}

      <View style={{ marginTop: 30 }}>
        <AuthButton
          title={t("registerScreen.buttonRegister")}
          onPress={handleRegister}
          loading={isLoading}
          disabled={isLoading}
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

      <CustomAlert
        visible={modalConfig.visible}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        buttonText="Mengerti"
        onClose={() => setModalConfig((prev) => ({ ...prev, visible: false }))}
        onConfirm={modalConfig.onConfirm}
      />
    </KeyboardAwareScrollView>
  );
}
