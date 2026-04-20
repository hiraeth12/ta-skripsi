import AuthButton from "@/components/auth-button";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function NewPassword() {
  // State secure dipisah agar kontrol mata kiri dan kanan tidak barengan
  const [secure, setSecure] = useState(true);
  const [secureConfirm, setSecureConfirm] = useState(true);

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

        <Text
          style={{
            fontSize: 24,
            fontWeight: "bold",
            textAlign: "left",
            marginBottom: 15,
            color: "#000",
          }}
        >
          Kata Sandi Baru
        </Text>

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
          title="Simpan Kata Sandi Baru"
          onPress={() => router.push("/starter/success-new-password")}
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
  description: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "left",
    marginBottom: 30,
    color: "#555",
    lineHeight: 20,
  },
  label: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 18,
    color: "#333",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  passwordContainer2: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    marginBottom: 40, // Jarak ke tombol bawah
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 8,
    color: "#000",
  },
});
