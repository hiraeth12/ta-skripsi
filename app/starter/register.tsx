import AuthButton from "@/components/auth-button";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView, // Tambahkan ScrollView untuk mengatasi
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function Register() {
  const router = useRouter();
  const [secure, setSecure] = useState(true);
  const [secureConfirm, setSecureConfirm] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const passwordsMatch = confirmPassword === "" || password === confirmPassword;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* ScrollView agar konten bisa digeser saat keyboard muncul */}
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <Image
          style={styles.image}
          source={require("@/assets/images/SeismoTrack_2-removebg-preview.png")}
          resizeMode="contain"
        />

        <Text style={styles.label}>Nama Depan</Text>
        <TextInput placeholder="Jane" style={styles.input} />

        <Text style={styles.label}>Nama Belakang</Text>
        <TextInput placeholder="Doe" style={styles.input} />

        <Text style={styles.label}>Email</Text>
        <TextInput
          placeholder="email@gmail.com"
          keyboardType="email-address"
          autoCapitalize="none" // Mencegah huruf kapital otomatis di email
          style={styles.input}
        />

        <Text style={styles.label}>Kata Sandi</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            placeholder="********"
            secureTextEntry={secure}
            style={styles.passwordInput}
            onChangeText={setPassword}
            value={password}
          />
          <TouchableOpacity onPress={() => setSecure(!secure)}>
            <Ionicons
              name={secure ? "eye-off-outline" : "eye-outline"}
              size={20}
              color="#888"
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Konfirmasi Kata Sandi</Text>
        <View
          style={[
            styles.passwordContainer,
            !passwordsMatch && { borderBottomColor: "red" },
          ]}
        >
          <TextInput
            placeholder="********"
            secureTextEntry={secureConfirm}
            style={styles.passwordInput}
            onChangeText={setConfirmPassword}
            value={confirmPassword}
          />
          <TouchableOpacity onPress={() => setSecureConfirm(!secureConfirm)}>
            <Ionicons
              name={secureConfirm ? "eye-off-outline" : "eye-outline"}
              size={20}
              color="#888"
            />
          </TouchableOpacity>
        </View>

        {!passwordsMatch && (
          <Text style={styles.errorText}>Kata sandi tidak cocok</Text>
        )}

        <View style={{ marginTop: 30 }}>
          <AuthButton
            title="Daftar"
            onPress={() => {
              console.log("Register pressed");
            }}
          />
        </View>

        <Text style={styles.signInText}>Sudah Punya Akun?</Text>
        <TouchableOpacity onPress={() => router.push("/starter/login")}>
          <Text
            style={{ color: "#1E6F9F", fontWeight: "bold", textAlign: "right" }}
          >
            Masuk
          </Text>
        </TouchableOpacity>
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
    justifyContent: "center", // Menjaga konten tetap di tengah saat tidak ada keyboard
    minHeight: "100%", // Memastikan scroll memenuhi layar
  },
  image: {
    width: 180,
    height: 59,
    alignSelf: "center",
    marginBottom: 30, // Mengurangi margin sedikit agar tidak terlalu mepet saat keyboard naik
  },
  label: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 18,
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    paddingVertical: 8,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 8,
  },
  errorText: {
    color: "red",
    fontSize: 12,
    marginTop: 4,
  },
  signInText: {
    textAlign: "right",
    fontSize: 13,
    marginTop: 20,
    color: "#555",
  },
});
