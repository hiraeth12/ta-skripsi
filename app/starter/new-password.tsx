import AuthButton from "@/components/auth-button";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { resetPasswordWithToken } from "../../features/starter/services/auth-service";
import { styles } from "../../features/starter/styles/new-password-styles";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import CustomAlert from "@/components/ui/custom-alert";

export default function NewPassword() {
  const { email, resetToken } = useLocalSearchParams<{ email: string; resetToken: string }>();
  const [secure, setSecure] = useState(true);
  const [secureConfirm, setSecureConfirm] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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

  const handleResetPassword = async () => {
    if (password.length < 6) {
      showCustomAlert(
        "Kata Sandi Tidak Valid",
        "Silakan masukkan kata sandi minimal 6 karakter.",
        "error"
      );
      return;
    }
    if (password !== confirmPassword) {

      showCustomAlert(
        "Kata Sandi Tidak Cocok",
        "Silakan masukkan kata sandi yang sama di kedua kolom.",
        "error"
      );
      return;
    }

    setIsLoading(true);
    try {
      await resetPasswordWithToken(email || "", resetToken || "", password);
      router.push("/starter/success-new-password");
    } catch (error) {
      showCustomAlert(
        "Gagal Menyimpan",
        "Gagal menyimpan kata sandi baru.",
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

        <Text
          style={styles.label}
        >
          Kata Sandi Baru
        </Text>

        <Text style={styles.description}>
          Silakan buat kata sandi baru yang kuat untuk akun Anda. Pastikan kedua
          kolom di bawah ini terisi dengan benar.
        </Text>

        <Text style={styles.label}>Kata Sandi</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            placeholder="********"
            placeholderTextColor="#999"
            secureTextEntry={secure}
            style={styles.passwordInput}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity onPress={() => setSecure(!secure)}>
            <Ionicons
              name={secure ? "eye-off-outline" : "eye-outline"}
              size={20}
              color="#888"
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Konfirmasi Sandi</Text>
        <View style={styles.passwordContainer2}>
          <TextInput
            placeholder="********"
            placeholderTextColor="#999"
            secureTextEntry={secureConfirm}
            style={styles.passwordInput}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          <TouchableOpacity onPress={() => setSecureConfirm(!secureConfirm)}>
            <Ionicons
              name={secureConfirm ? "eye-off-outline" : "eye-outline"}
              size={20}
              color="#888"
            />
          </TouchableOpacity>
        </View>

        <AuthButton
          title={isLoading ? "Menyimpan..." : "Simpan Kata Sandi Baru"}
          onPress={handleResetPassword}
          disabled={isLoading}
        />
      </ScrollView>

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
