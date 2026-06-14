import AuthButton from "@/components/ui/auth-button";
import { router } from "expo-router";
import { Image, Text, View } from "react-native";
import { styles } from "../styles/success-new-password-styles";
import { useTranslation } from "react-i18next";

export default function SuccessNewPassword() {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
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

      <Text style={styles.title}>{t("successNewPasswordScreen.title")}</Text>

      <Text style={styles.description}>{t("successNewPasswordScreen.description")}</Text>

      <AuthButton
        title={t("successNewPasswordScreen.buttonLogin")}
        onPress={() => router.replace("/starter/login")}
      />
    </View>
  );
}
