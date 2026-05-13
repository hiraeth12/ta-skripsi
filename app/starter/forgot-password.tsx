import AuthButton from "@/components/auth-button";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { sendResetOtp } from "../../features/starter/services/auth-service";
import { styles } from "../../features/starter/styles/forgot-password-styles";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOtp = async () => {
    if (!email.includes("@")) {
      Alert.alert("Input Tidak Valid", "Silakan masukkan alamat email yang valid.");
      return;
    }
    
    setIsLoading(true);
    try {
      await sendResetOtp(email);
      router.push({ pathname: "/starter/verify-code", params: { email } });
    } catch (error) {
      Alert.alert("Error", "Gagal mengirim OTP.");
    } finally {
      setIsLoading(false);
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

