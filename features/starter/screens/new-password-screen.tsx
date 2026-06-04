import AuthButton from "@/components/auth-button";
import CustomAlert from "@/components/ui/custom-alert";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next"; // <-- Import i18n
import {
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { resetPasswordWithToken } from "../services/auth-service";
import { styles } from "../styles/new-password-styles";

export default function NewPassword() {
  const { t } = useTranslation(); // <-- Hook i18n dipanggil di sini
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
        t("newPasswordScreen.alert.invalidPasswordTitle"),
        t("newPasswordScreen.alert.invalidPasswordMsg"),
        "error",
      );
      return;
    }
    if (password !== confirmPassword) {
      showCustomAlert(
        t("newPasswordScreen.alert.passwordMismatchTitle"),
        t("newPasswordScreen.alert.passwordMismatchMsg"),
        "error",
      );
      return;
    }

    setIsLoading(true);
    try {
      await resetPasswordWithToken(email || "", resetToken || "", password);
      router.push("/starter/success-new-password");
    } catch (error) {
      showCustomAlert(
        t("newPasswordScreen.alert.saveFailedTitle"),
        t("newPasswordScreen.alert.saveFailedMsg"),
        "error",
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

        <Text style={styles.label}>{t("newPasswordScreen.title")}</Text>

        <Text style={styles.description}>
          {t("newPasswordScreen.description")}
        </Text>

        <Text style={styles.label}>{t("newPasswordScreen.passwordLabel")}</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            placeholder={t("newPasswordScreen.passwordPlaceholder")}
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

        <Text style={styles.label}>
          {t("newPasswordScreen.confirmPasswordLabel")}
        </Text>
        <View style={styles.passwordContainer2}>
          <TextInput
            placeholder={t("newPasswordScreen.passwordPlaceholder")}
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
          title={
            isLoading
              ? t("newPasswordScreen.buttonLoading")
              : t("newPasswordScreen.buttonSave")
          }
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
