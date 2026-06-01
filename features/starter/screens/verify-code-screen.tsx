import AuthButton from "@/components/ui/auth-button";
import CustomAlert from "@/components/ui/custom-alert";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Image, Text, TextInput, TouchableOpacity, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import {
    PasswordResetApiError,
    sendResetOtp,
    verifyOtpCode,
} from "../services/auth-service";
import { styles } from "../styles/verify-code-styles";

const OTP_LENGTH = 6;

function getOtpErrorMessage(error: unknown): string {
  if (!(error instanceof PasswordResetApiError)) {
    return "Kode OTP salah atau kedaluwarsa.";
  }
  const messages: Record<string, string> = {
    otp_already_used:
      "Kode OTP sudah pernah dipakai. Silakan kirim ulang kode.",
    otp_attempts_exceeded:
      "Terlalu banyak percobaan. Silakan kirim ulang kode.",
    otp_expired: "Kode OTP sudah kedaluwarsa. Silakan kirim ulang kode.",
  };
  return (
    (error.code ? messages[error.code] : undefined) ??
    "Kode OTP salah atau kedaluwarsa."
  );
}

export default function VerifyCode() {
  const router = useRouter();
  const navigation = useNavigation();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [timer, setTimer] = useState(30);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const inputRefs = useRef<TextInput[]>([]);

  const [modalConfig, setModalConfig] = useState({
    visible: false,
    title: "",
    message: "",
    type: "error" as "error" | "success",
    onConfirm: undefined as (() => void) | undefined,
  });

  const showCustomAlert = (
    title: string,
    message: string,
    type: "error" | "success" = "error",
    onConfirm?: () => void,
  ) => {
    setModalConfig({ visible: true, title, message, type, onConfirm });
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      if (e.data.action.type !== "GO_BACK" && e.data.action.type !== "POP")
        return;

      e.preventDefault();

      showCustomAlert(
        "Keluar Verifikasi?",
        "Kode OTP yang telah dikirim akan menjadi tidak valid jika Anda kembali. Yakin ingin keluar?",
        "error",
        () => navigation.dispatch(e.data.action),
      );
    });

    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    if (timer === 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const formatTime = (seconds: number) =>
    `00:${seconds < 10 ? `0${seconds}` : seconds}`;

  const handleInput = (text: string, index: number) => {
    const newCode = [...code];
    const cleanText = text.replace(/[^0-9]/g, "");
    newCode[index] = cleanText.slice(-1);
    setCode(newCode);

    if (cleanText.length === 1 && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && code[index] === "" && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handleVerify = async () => {
    const combinedCode = code.join("");
    if (combinedCode.length < OTP_LENGTH) {
      showCustomAlert(
        "Input Tidak Valid",
        "Silakan masukkan kode 6 digit.",
        "error",
      );
      return;
    }

    if (!email) {
      showCustomAlert(
        "Error",
        "Email tidak ditemukan. Silakan ulangi dari awal.",
        "error",
      );
      return;
    }

    setIsLoading(true);
    try {
      const resetToken = await verifyOtpCode(email, combinedCode);
      setIsLoading(false);
      router.push({
        pathname: "/starter/new-password",
        params: { email, resetToken },
      });
    } catch (error) {
      showCustomAlert("Verifikasi Gagal", getOtpErrorMessage(error), "error");
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
        "Kode Dikirim",
        "Kode verifikasi baru telah dikirim ke email Anda.",
        "success",
      );
    } catch {
      showCustomAlert(
        "Gagal",
        "Gagal mengirim ulang OTP. Silakan coba lagi.",
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

      <Text style={styles.title}>Verifikasi Alamat Email</Text>
      <Text style={styles.subtitle}>
        Kode verifikasi telah dikirim ke:{"\n"}
        <Text style={styles.emailText}>{email || "email@gmail.com"}</Text>
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
              selectionColor="#1E6F9F"
              onChangeText={(text) => handleInput(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              value={digit}
              placeholder=""
            />
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
        title={isLoading ? "Memverifikasi..." : "Konfirmasi Kode"}
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
              Kirim ulang kode dalam{" "}
              <Text style={{ fontWeight: "bold" }}>{formatTime(timer)}</Text>
            </>
          ) : (
            <Text style={{ color: "#1E6F9F", fontWeight: "bold" }}>
              {isResending ? "Mengirim ulang..." : "Kirim Ulang Kode"}
            </Text>
          )}
        </Text>
      </TouchableOpacity>

      <CustomAlert
        visible={modalConfig.visible}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        onClose={() =>
          setModalConfig({
            ...modalConfig,
            visible: false,
            onConfirm: undefined,
          })
        }
        onConfirm={modalConfig.onConfirm}
      />
    </KeyboardAwareScrollView>
  );
}
