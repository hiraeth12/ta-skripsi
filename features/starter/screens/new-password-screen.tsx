import AuthButton from "@/components/ui/auth-button";
import CustomAlert from "@/components/ui/custom-alert";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Text, TextInput, TouchableOpacity, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { resetPasswordWithToken } from "../services/auth-service";
import { styles } from "../styles/new-password-styles";

export default function NewPassword() {
  const router = useRouter();
  const navigation = useNavigation();
  const { email, resetToken } = useLocalSearchParams<{
    email: string;
    resetToken: string;
  }>();

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
        "Batalkan Reset Kata Sandi?",
        "Jika Anda kembali, proses reset kata sandi akan dibatalkan dan token akan menjadi tidak valid.",
        "error",
        () => navigation.dispatch(e.data.action),
      );
    });

    return unsubscribe;
  }, [navigation]);

  const handleResetPassword = async () => {
    const trimmedPassword = password.trim();
    if (!trimmedPassword) {
      showCustomAlert(
        "Kata Sandi Kosong",
        "Silakan masukkan kata sandi baru.",
        "error",
      );
      return;
    }

    if (trimmedPassword.length < 6) {
      showCustomAlert(
        "Kata Sandi Tidak Valid",
        "Silakan masukkan kata sandi minimal 6 karakter.",
        "error",
      );
      return;
    }

    if (password !== confirmPassword) {
      showCustomAlert(
        "Kata Sandi Tidak Cocok",
        "Silakan masukkan kata sandi yang sama di kedua kolom.",
        "error",
      );
      return;
    }

    if (!email || !resetToken) {
      showCustomAlert(
        "Sesi Tidak Valid",
        "Sesi reset kata sandi tidak valid. Silakan ulangi dari awal.",
        "error",
      );
      return;
    }

    setIsLoading(true);
    try {
      await resetPasswordWithToken(email, resetToken, password);
      setIsLoading(false);
      router.push("/starter/success-new-password");
    } catch {
      showCustomAlert(
        "Gagal Menyimpan",
        "Gagal menyimpan kata sandi baru.",
        "error",
      );
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

      <Text style={styles.label}>Kata Sandi Baru</Text>

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
