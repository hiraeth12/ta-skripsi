import AuthButton from "@/components/auth-button";
import { router } from "expo-router";
import { Image, Text, View } from "react-native";
import { styles } from "../styles/success-new-password-styles";

export default function SuccessNewPassword() {
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

      <Text style={styles.title}>Kata Sandi Berhasil Diubah</Text>

      <Text style={styles.description}>
        Kata sandi Anda telah berhasil diubah. Silakan gunakan kata sandi baru
        Anda untuk masuk ke akun Anda.
      </Text>

      <AuthButton
        title="Menuju Halaman Masuk"
        onPress={() => router.replace("/starter/login")}
      />
    </View>
  );
}