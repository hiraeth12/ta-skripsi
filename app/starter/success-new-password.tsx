import AuthButton from "@/components/auth-button";
import { router } from "expo-router";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";

export default function SuccessNewPassword() {
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EDEDED",
  },
  scrollContainer: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100%",
  },
  logo: {
    width: 160,
    height: 50,
    alignSelf: "center",
    marginBottom: 40,
    marginTop: 20,
  },
  image: {
    width: 220, // Diselaraskan ukurannya dengan ilustrasi di halaman sebelumnya
    height: 220,
    alignSelf: "center",
    marginBottom: 15,
  },
  description: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 30,
    color: "#555",
    lineHeight: 20,
    paddingHorizontal: 10,
  },
});
