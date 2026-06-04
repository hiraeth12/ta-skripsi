import AuthButton from "@/components/auth-button";
import CustomAlert from "@/components/ui/custom-alert"; // 1. Import CustomAlert
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next"; // <-- Import i18n
import { Image, Text, TextInput, View } from "react-native"; // 2. Hapus import 'Alert' dari sini
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { sendResetOtp } from "../services/auth-service";
import { styles } from "../styles/forgot-password-styles";

export default function ForgotPassword() {
  const { t } = useTranslation(); // <-- Panggil hook i18n

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const isSubmittingRef = useRef(false);

  // 3. Tambahkan State untuk mengontrol Modal Custom
  const [modalConfig, setModalConfig] = useState({
    visible: false,
    title: "",
    message: "",
    type: "error" as "error" | "success",
  });

  // 4. Tambahkan fungsi helper
  const showCustomAlert = (
    title: string,
    message: string,
    type: "error" | "success" = "error",
  ) => {
    setModalConfig({ visible: true, title, message, type });
  };

  const handleSendOtp = async () => {
    if (isSubmittingRef.current) return;

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail.includes("@")) {
      // 5. Ganti Alert bawaan dengan showCustomAlert dan i18n
      showCustomAlert(
        t("forgotPasswordScreen.alert.invalidInputTitle"),
        t("forgotPasswordScreen.alert.invalidInputMsg"),
        "error",
      );
      return;
    }

    isSubmittingRef.current = true;
    setIsLoading(true);
    try {
      await sendResetOtp(trimmedEmail);
      router.push({
        pathname: "/starter/verify-code",
        params: { email: trimmedEmail },
      });
    } catch (error) {
      // Ganti Alert bawaan dengan showCustomAlert dan i18n
      const message =
        error instanceof Error
          ? error.message
          : t("forgotPasswordScreen.alert.failMsg");

      showCustomAlert(
        t("forgotPasswordScreen.alert.failTitle"),
        message,
        "error",
      );
    } finally {
      isSubmittingRef.current = false;
      setIsLoading(false);
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
      {/* Logo SeismoTrack */}
      <Image
        style={styles.logo}
        source={require("@/assets/images/SeismoTrack_2-removebg-preview.png")}
        resizeMode="contain"
      />

      {/* Ilustrasi - Ukuran diselaraskan (sedikit diperkecil agar tidak sesak) */}
      <Image
        style={styles.image}
        source={require("@/assets/images/Forgot password-bro 2.png")}
        resizeMode="contain"
      />

      {/* <-- Menggunakan t() untuk semua teks --> */}
      <Text style={styles.title}>{t("forgotPasswordScreen.title")}</Text>

      <Text style={styles.description}>
        {t("forgotPasswordScreen.description")}
      </Text>

      <View style={styles.inputArea}>
        <Text style={styles.label}>{t("forgotPasswordScreen.emailLabel")}</Text>
        <TextInput
          placeholder={t("forgotPasswordScreen.emailPlaceholder")}
          placeholderTextColor="#999"
          keyboardType="email-address"
          autoCapitalize="none"
          selectionColor="#1E6F9F" // Diselaraskan dengan kursor biru di VerifyCode
          style={styles.input}
          value={email}
          onChangeText={setEmail}
        />
      </View>

      <View style={styles.buttonWrapper}>
        <AuthButton
          title={
            isLoading
              ? t("forgotPasswordScreen.buttonSending")
              : t("forgotPasswordScreen.buttonSend")
          }
          onPress={handleSendOtp}
          disabled={isLoading}
        />
      </View>

      {/* 6. Panggil Komponen CustomAlert di bagian terbawah render */}
      <CustomAlert
        visible={modalConfig.visible}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        onClose={() => setModalConfig({ ...modalConfig, visible: false })}
      />
    </KeyboardAwareScrollView>
  );
}
