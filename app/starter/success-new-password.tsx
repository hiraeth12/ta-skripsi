import AuthButton from "@/components/auth-button";
import { router } from "expo-router";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
} from "react-native";
import { styles } from "../../features/starter/styles/success-new-password-styles";

export default function SuccessNewPassword() {
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
          Kata Sandi Berhasil Diubah
        </Text>

        <Text style={styles.description}>
          Kata sandi Anda telah berhasil diubah. Silakan gunakan kata sandi baru
          Anda untuk masuk ke akun Anda.
        </Text>

        <AuthButton
          title="Menuju Halaman Masuk"
          onPress={() => router.replace("/starter/login")} // Menggunakan replace agar tidak bisa kembali (back) ke halaman reset
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

