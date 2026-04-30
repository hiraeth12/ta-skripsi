import { styles } from "../../features/starter/styles/forgot-password-styles";
import AuthButton from "@/components/auth-button";
import { router } from "expo-router";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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

