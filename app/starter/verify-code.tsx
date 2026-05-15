import AuthButton from "@/components/auth-button";
import CustomAlert from "@/components/ui/custom-alert"; // 1. Import CustomAlert
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"; // 2. Hapus import 'Alert' dan 'Platform' (karena Platform tidak terpakai)
import { verifyOtpCode } from "../../features/starter/services/auth-service";
import { styles } from "../../features/starter/styles/verify-code-styles";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

export default function VerifyCode() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState(["", "", "", ""]);
  const [timer, setTimer] = useState(30);
  const [isLoading, setIsLoading] = useState(false);
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
    if (cleanText.length === 1 && index < 3) {
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
    if (combinedCode.length < 4) {
      // 5. Ganti Alert bawaan
      showCustomAlert(
        "Input Tidak Valid",
        "Silakan masukkan kode 4 digit.",
        "error"
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
      // 5. Ganti Alert bawaan
      showCustomAlert(
        "Verifikasi Gagal",
        "Kode OTP salah atau kedaluwarsa.",
        "error"
      );
    } finally {
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
          title={isLoading ? "Memverifikasi..." : "Konfirmasi Kode"}
          onPress={handleVerify}
          disabled={isLoading}
        />

        <TouchableOpacity
          disabled={timer !== 0}
          onPress={() => setTimer(30)}
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
                Kirim Ulang Kode
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