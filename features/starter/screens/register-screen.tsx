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
import { useTranslation } from "react-i18next"; // <-- Import i18n
import { Image, Text, TextInput, TouchableOpacity, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { styles } from "../styles/register-styles";

const FIREBASE_DATABASE_URL =
  process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL?.trim() || "";

export default function Register() {
  const { t } = useTranslation(); // <-- Hook i18n dipanggil di sini
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
        t("registerScreen.alert.passwordMismatchTitle"),
        t("registerScreen.alert.passwordMismatchMsg"),
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
        t("registerScreen.alert.missingInputTitle"),
        t("registerScreen.alert.missingInputMsg"),
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
        t("registerScreen.alert.registerSuccessTitle"),
        t("registerScreen.alert.registerSuccessMsg"),
        "success",
        () => router.push("/starter/login"),
      );
    } catch (e) {
      const error = e as { code?: string; message?: string };
      showCustomAlert(
        t("registerScreen.alert.registerFailedTitle"),
        `${error?.code || "error"}: ${error?.message || t("registerScreen.alert.registerFailedDefaultMsg")}`,
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

      <Text style={styles.label}>{t("registerScreen.firstNameLabel")}</Text>
      <TextInput
        placeholder={t("registerScreen.firstNamePlaceholder")}
        placeholderTextColor="#999"
        style={styles.input}
        value={firstName}
        onChangeText={setFirstName}
      />

      <Text style={styles.label}>{t("registerScreen.lastNameLabel")}</Text>
      <TextInput
        placeholder={t("registerScreen.lastNamePlaceholder")}
        placeholderTextColor="#999"
        style={styles.input}
        value={lastName}
        onChangeText={setLastName}
      />

      <Text style={styles.label}>{t("registerScreen.emailLabel")}</Text>
      <TextInput
        placeholder={t("registerScreen.emailPlaceholder")}
        placeholderTextColor="#999"
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
      />

      <Text style={styles.label}>{t("registerScreen.passwordLabel")}</Text>
      <View style={styles.passwordContainer}>
        <TextInput
          placeholder={t("registerScreen.passwordPlaceholder")}
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

      <Text style={styles.label}>
        {t("registerScreen.confirmPasswordLabel")}
      </Text>
      <View
        style={[
          styles.passwordContainer,
          !passwordsMatch && { borderBottomColor: "red" },
        ]}
      >
        <TextInput
          placeholder={t("registerScreen.passwordPlaceholder")}
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
        <Text style={styles.errorText}>
          {t("registerScreen.passwordMismatchError")}
        </Text>
      )}

      <View style={{ marginTop: 30 }}>
        <AuthButton
          title={t("registerScreen.buttonRegister")}
          onPress={handleRegister}
        />
      </View>

      <Text style={styles.signInText}>
        {t("registerScreen.haveAccountText")}
      </Text>
      <TouchableOpacity onPress={() => router.push("/starter/login")}>
        <Text
          style={{ color: "#1E6F9F", fontWeight: "bold", textAlign: "right" }}
        >
          {t("registerScreen.loginText")}
        </Text>
      </TouchableOpacity>

      {/* Gunakan Komponen yang sudah direusable di sini */}
      <CustomAlert
        visible={modalConfig.visible}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        buttonText={t("registerScreen.alertButtonUnderstand")}
        onClose={() => setModalConfig({ ...modalConfig, visible: false })}
        onConfirm={modalConfig.onConfirm}
      />
    </KeyboardAwareScrollView>
  );
}
