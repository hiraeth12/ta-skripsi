import AuthButton from "@/components/auth-button";
import CustomAlert from "@/components/ui/custom-alert"; // 1. Import CustomAlert
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Image,
  Text,
  TextInput,
  View,
} from "react-native"; // 2. Hapus import 'Alert' dari sini
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { sendResetOtp } from "../../features/starter/services/auth-service";
import { styles } from "../../features/starter/styles/forgot-password-styles";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
    if (!email.includes("@")) {
      // 5. Ganti Alert bawaan dengan showCustomAlert
      showCustomAlert(
        "Input Tidak Valid",
        "Silakan masukkan alamat email yang valid.",
        "error"
      );
      return;
    }
    
    setIsLoading(true);
    try {
      await sendResetOtp(email);
      router.push({ pathname: "/starter/verify-code", params: { email } });
    } catch (error) {
      // Ganti Alert bawaan dengan showCustomAlert
      showCustomAlert(
        "Gagal",
        "Gagal mengirim OTP. Silakan coba lagi.",
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

        <Text style={styles.title}>Lupa Kata Sandi</Text>

        <Text style={styles.description}>
          Silakan masukkan alamat email Anda untuk menerima kode verifikasi
          untuk mengatur ulang kata sandi.
        </Text>

        <View style={styles.inputArea}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            placeholder="email@gmail.com"
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
            title={isLoading ? "Mengirim..." : "Kirim Kode Verifikasi"}
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