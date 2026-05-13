import AuthButton from "@/components/auth-button";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { resetPasswordWithToken } from "../../features/starter/services/auth-service";
import { styles } from "../../features/starter/styles/new-password-styles";

export default function NewPassword() {
  const { email, resetToken } = useLocalSearchParams<{ email: string; resetToken: string }>();
  const [secure, setSecure] = useState(true);
  const [secureConfirm, setSecureConfirm] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleResetPassword = async () => {
    if (password.length < 6) {
      Alert.alert("Error", "Kata sandi harus terdiri dari minimal 6 karakter.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Kata sandi tidak cocok.");
      return;
    }

    setIsLoading(true);
    try {
      await resetPasswordWithToken(email || "", resetToken || "", password);
      router.push("/starter/success-new-password");
    } catch (error) {
      Alert.alert("Error", "Gagal menyimpan kata sandi baru.");
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
    </KeyboardAvoidingView>
  );
}
