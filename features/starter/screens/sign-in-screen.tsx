import AuthButton from "@/components/ui/auth-button";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next"; // <-- Import i18n
import { Image, View } from "react-native";
import { styles } from "../styles/sign-in-styles";

export default function SignIn() {
  const router = useRouter();
  const { t } = useTranslation(); // <-- Hook i18n dipanggil di sini

  return (
    <View style={styles.container}>
      <Image
        style={styles.image}
        source={require("@/assets/images/SeismoTrack_2-removebg-preview.png")}
        resizeMode="contain"
      />

      <View style={styles.buttonContainer}>
        <AuthButton
          title={t("signInScreen.buttonLogin")} // <-- Menggunakan t()
          onPress={() => router.push("/starter/login")}
        />
        <View style={{ height: 14 }} />
        <AuthButton
          title={t("signInScreen.buttonRegister")} // <-- Menggunakan t()
          onPress={() => router.push("/starter/register")}
        />
      </View>
    </View>
  );
}
