import AuthButton from "@/components/ui/auth-button";
import CustomAlert from "@/components/ui/custom-alert";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Image, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { sendResetOtp } from "../services/auth-service";
import { styles } from "../styles/forgot-password-styles";

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const isSubmittingRef = useRef(false);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  const handleSendOtp = async () => {
    if (isSubmittingRef.current) return;

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      showCustomAlert(
        "Input Kosong",
        "Silakan masukkan alamat email Anda.",
        "error",
      );
      return;
    }

    if (!emailRegex.test(trimmedEmail)) {
      showCustomAlert(
        "Input Tidak Valid",
        "Silakan masukkan alamat email yang valid.",
        "error",
      );
      return;
    }

    isSubmittingRef.current = true;
    setIsLoading(true);

    try {
      await sendResetOtp(trimmedEmail);
      isSubmittingRef.current = false;
      setIsLoading(false);
      router.push({
        pathname: "/starter/verify-code",
        params: { email: trimmedEmail },
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Gagal mengirim OTP. Silakan coba lagi.";
      showCustomAlert("Gagal", message, "error");
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
      <Image
        style={styles.logo}
        source={require("@/assets/images/SeismoTrack_2-removebg-preview.png")}
        resizeMode="contain"
      />

      <Image
        style={styles.image}
        source={require("@/assets/images/Forgot password-bro 2.png")}
        resizeMode="contain"
      />

      <Text style={styles.title}>{t("forgotPasswordScreen.title")}</Text>

      <Text style={styles.description}>
        Silakan masukkan alamat email Anda untuk menerima kode verifikasi untuk
        mengatur ulang kata sandi.
      </Text>

      <View style={styles.inputArea}>
        <Text style={styles.label}>{t("forgotPasswordScreen.emailLabel")}</Text>
        <TextInput
          placeholder={t("forgotPasswordScreen.emailPlaceholder")}
          placeholderTextColor="#999"
          keyboardType="email-address"
          autoCapitalize="none"
          selectionColor="#1E6F9F"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
        />
      </View>

      <View style={styles.buttonWrapper}>
        <AuthButton
          title={isLoading ? t("forgotPasswordScreen.buttonSending") : t("forgotPasswordScreen.buttonSend")}
          onPress={handleSendOtp}
          disabled={isLoading}
        />
      </View>

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
