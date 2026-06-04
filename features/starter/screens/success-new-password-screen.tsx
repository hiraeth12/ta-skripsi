import AuthButton from "@/components/auth-button";
import { router } from "expo-router";
import { useTranslation } from "react-i18next"; // <-- Import i18n
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
} from "react-native";
import { styles } from "../styles/success-new-password-styles";

export default function SuccessNewPassword() {
  const { t } = useTranslation(); // <-- Hook i18n dipanggil di sini

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

        <Image
          style={styles.image}
          source={require("@/assets/images/My password-pana 2.png")}
          resizeMode="contain"
        />

        <Text
          style={{
            fontSize: 24,
            fontWeight: "bold",
            textAlign: "center",
            marginBottom: 15,
            color: "#000",
          }}
        >
          {t("successNewPasswordScreen.title")}
        </Text>

        <Text style={styles.description}>
          {t("successNewPasswordScreen.description")}
        </Text>

        <AuthButton
          title={t("successNewPasswordScreen.buttonLogin")}
          onPress={() => router.replace("/starter/login")} // Menggunakan replace agar tidak bisa kembali (back) ke halaman reset
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
