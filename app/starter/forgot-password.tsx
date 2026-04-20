import AuthButton from "@/components/auth-button";
import { router } from "expo-router";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function ForgotPassword() {
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo SeismoTrack */}
        <Image
          style={styles.logo}
          source={require("@/assets/images/SeismoTrack_2-removebg-preview.png")}
          resizeMode="contain"
        />

        {/* Ilustrasi - Ukuran diselaraskan (sedikit diperkecil agar tidak sesak) */}
        <Image
          style={styles.image}
          source={require("@/assets/images/Forgot password-bro 2.png")}
          resizeMode="contain"
        />

        <Text style={styles.title}>Lupa Kata Sandi</Text>

        <Text style={styles.description}>
          Silakan masukkan alamat email Anda untuk menerima kode verifikasi
          untuk mengatur ulang kata sandi.
        </Text>

        <View style={styles.inputArea}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            placeholder="email@gmail.com"
            placeholderTextColor="#999"
            keyboardType="email-address"
            autoCapitalize="none"
            selectionColor="#1E6F9F" // Diselaraskan dengan kursor biru di VerifyCode
            style={styles.input}
          />
        </View>

        <View style={styles.buttonWrapper}>
          <AuthButton
            title="Kirim Kode Verifikasi"
            onPress={() => router.push("/starter/verify-code")}
          />
        </View>
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
    alignItems: "center", // Memastikan semua elemen berada di tengah secara horizontal
    justifyContent: "center",
    minHeight: "100%",
  },
  logo: {
    width: 160,
    height: 50,
    alignSelf: "center",
    marginBottom: 20,
    marginTop: 20,
  },
  image: {
    width: 220, // Ukuran disamakan dengan VerifyCode agar proporsional
    height: 220,
    alignSelf: "center",
    marginBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 15,
    color: "#000",
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
  inputArea: {
    width: "100%",
    marginBottom: 35,
  },
  label: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 5,
  },
  input: {
    borderBottomWidth: 1.5, // Sedikit lebih tebal agar lebih tegas seperti kotak OTP
    borderBottomColor: "#ccc",
    paddingVertical: 10,
    fontSize: 16,
    color: "#000",
  },
  buttonWrapper: {
    width: "100%",
    alignItems: "center",
    marginBottom: 20,
  },
});
