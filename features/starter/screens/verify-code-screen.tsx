import AuthButton from "@/components/auth-button";
import CustomAlert from "@/components/ui/custom-alert"; // 1. Import CustomAlert
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next"; // <-- Import i18n
import {
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"; // 2. Hapus import 'Alert' dan 'Platform' (karena Platform tidak terpakai)
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import {
  PasswordResetApiError,
  sendResetOtp,
  verifyOtpCode,
} from "../services/auth-service";
import { styles } from "../styles/verify-code-styles";

const OTP_LENGTH = 6;

export default function VerifyCode() {
  const { t } = useTranslation(); // <-- Hook i18n dipanggil di sini
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [timer, setTimer] = useState(30);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const inputRefs = useRef<TextInput[]>([]);

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

  // Timer Countdown Logic
  useEffect(() => {
    if (timer === 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const formatTime = (seconds: number) => {
    return `00:${seconds < 10 ? `0${seconds}` : seconds}`;
  };

  const handleInput = (text: string, index: number) => {
    const newCode = [...code];
    // Hanya ambil karakter terakhir jika user mengetik cepat
    const cleanText = text.replace(/[^0-9]/g, "");
    newCode[index] = cleanText.slice(-1);
    setCode(newCode);

    // Otomatis pindah ke kanan jika diisi
    if (cleanText.length === 1 && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Otomatis pindah ke kiri jika dihapus saat kotak kosong
    if (e.nativeEvent.key === "Backspace" && code[index] === "" && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handleVerify = async () => {
    const combinedCode = code.join("");
    if (combinedCode.length < OTP_LENGTH) {
      // 5. Ganti Alert bawaan dengan i18n
      showCustomAlert(
        t("verifyCodeScreen.alert.invalidInputTitle"),
        t("verifyCodeScreen.alert.invalidInputMsg"),
        "error",
      );
      return;
    }

    setIsLoading(true);
    try {
      const resetToken = await verifyOtpCode(email || "", combinedCode);
      router.push({
        pathname: "/starter/new-password",
        params: { email, resetToken },
      });
    } catch (error) {
      // 5. Ganti Alert bawaan dengan logika i18n
      const message =
        error instanceof PasswordResetApiError &&
        error.code === "otp_already_used"
          ? t("verifyCodeScreen.alert.otpUsed")
          : error instanceof PasswordResetApiError &&
              error.code === "otp_attempts_exceeded"
            ? t("verifyCodeScreen.alert.otpTooManyAttempts")
            : error instanceof PasswordResetApiError &&
                error.code === "otp_expired"
              ? t("verifyCodeScreen.alert.otpExpired")
              : t("verifyCodeScreen.alert.otpInvalid");

      showCustomAlert(
        t("verifyCodeScreen.alert.verifyFailedTitle"),
        message,
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email || timer !== 0 || isResending) return;

    setIsResending(true);
    try {
      await sendResetOtp(email);
      setCode(Array(OTP_LENGTH).fill(""));
      setTimer(30);
      showCustomAlert(
        t("verifyCodeScreen.alert.resendSuccessTitle"),
        t("verifyCodeScreen.alert.resendSuccessMsg"),
        "success",
      );
    } catch (error) {
      showCustomAlert(
        t("verifyCodeScreen.alert.resendFailedTitle"),
        t("verifyCodeScreen.alert.resendFailedMsg"),
        "error",
      );
    } finally {
      setIsResending(false);
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
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
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

        <Text style={styles.title}>{t("verifyCodeScreen.title")}</Text>
        <Text style={styles.subtitle}>
          {t("verifyCodeScreen.subtitlePrefix")}
          {"\n"}
          <Text style={styles.emailText}>
            {email || t("verifyCodeScreen.fallbackEmail")}
          </Text>
        </Text>

        <View style={styles.otpContainer}>
          {code.map((digit, index) => (
            <View key={index} style={styles.inputWrapper}>
              <TextInput
                ref={(ref) => {
                  inputRefs.current[index] = ref as TextInput;
                }}
                style={styles.input}
                maxLength={1}
                keyboardType="number-pad"
                selectionColor="#1E6F9F" // Warna kursor | di tengah
                onChangeText={(text) => handleInput(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                value={digit}
                placeholder="" // Placeholder kosong agar tidak menimpa garis bawah
              />
              {/* Garis bawah kustom yang tidak hilang saat ada angka */}
              <View
                style={[
                  styles.underline,
                  digit ? styles.underlineActive : styles.underlineInactive,
                ]}
              />
            </View>
          ))}
        </View>

        <AuthButton
          title={
            isLoading
              ? t("verifyCodeScreen.buttonVerifying")
              : t("verifyCodeScreen.buttonVerify")
          }
          onPress={handleVerify}
          disabled={isLoading}
        />

        <TouchableOpacity
          disabled={timer !== 0 || isResending}
          onPress={handleResend}
          style={{ marginTop: 25 }}
        >
          <Text style={styles.resendText}>
            {timer > 0 ? (
              <>
                {t("verifyCodeScreen.resendCountdown")}
                <Text style={{ fontWeight: "bold" }}>{formatTime(timer)}</Text>
              </>
            ) : (
              <Text style={{ color: "#1E6F9F", fontWeight: "bold" }}>
                {isResending
                  ? t("verifyCodeScreen.resendSending")
                  : t("verifyCodeScreen.resendButton")}
              </Text>
            )}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 6. Panggil Komponen CustomAlert di sini */}
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
