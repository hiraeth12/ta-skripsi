import AuthButton from "@/components/auth-button";
import CustomAlert from "@/components/ui/custom-alert";
import { saveFcmTokenToDatabase } from "@/hooks/use-fcm-token-save";
import { Ionicons } from "@expo/vector-icons";
import { getApp } from "@react-native-firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
} from "@react-native-firebase/auth";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next"; // <-- Import i18n
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

export default function Login() {
  const { t } = useTranslation(); // <-- Hook i18n dipanggil di sini
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
    type: "error" as "error" | "success", // Tambahkan as "error" | "success" untuk TypeScript
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
      // <-- Menggunakan t()
      showCustomAlert(
        t("loginScreen.alert.missingInputTitle"),
        t("loginScreen.alert.missingInputMsg"),
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

      // Fire-and-forget — don't block navigation on token save
      if (result.user?.uid) {
        saveFcmTokenToDatabase(result.user.uid).catch(() => {});
      }

      router.replace("/starter/ask-location");
    } catch (e) {
      const error = e as { code?: string; message?: string };
      // <-- Menggunakan t()
      showCustomAlert(
        t("loginScreen.alert.loginFailedTitle"),
        t("loginScreen.alert.loginFailedMsg"),
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

        {/* <-- Menggunakan t() untuk label Email --> */}
        <Text style={styles.label}>{t("loginScreen.emailLabel")}</Text>
        <TextInput
          placeholder={t("loginScreen.emailPlaceholder")}
          placeholderTextColor="#999"
          value={email}
          onChangeText={(v) => setEmail(v.trimStart())}
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
        />

        {/* <-- Menggunakan t() untuk label Kata Sandi --> */}
        <Text style={styles.label}>{t("loginScreen.passwordLabel")}</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            placeholder={t("loginScreen.passwordPlaceholder")}
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
          {/* <-- Menggunakan t() untuk Lupa Kata Sandi --> */}
          <Text style={styles.forgotPassword}>
            {t("loginScreen.forgotPasswordText")}
          </Text>
        </TouchableOpacity>

        <AuthButton
          title={
            isSubmitting
              ? t("loginScreen.buttonLoading")
              : t("loginScreen.buttonLogin")
          }
          onPress={handleLogin}
          disabled={isSubmitting}
        />

        {/* <-- Menggunakan t() untuk Footer Daftar --> */}
        <Text style={styles.signUpText}>{t("loginScreen.noAccountText")}</Text>
        <TouchableOpacity onPress={() => router.push("/starter/register")}>
          <Text
            style={{ color: "#1E6F9F", fontWeight: "bold", textAlign: "right" }}
          >
            {t("loginScreen.registerText")}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Panggil Komponen CustomAlert di sini */}
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
