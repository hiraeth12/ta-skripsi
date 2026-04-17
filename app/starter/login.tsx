import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
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

import AuthButton from "@/components/auth-button";
import { getApp } from "@react-native-firebase/app";
import { getAuth, signInWithEmailAndPassword } from "@react-native-firebase/auth";

export default function Login() {
  const router = useRouter();
  const [secure, setSecure] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    if (isSubmitting) return;

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      Alert.alert("Input belum lengkap", "Email dan kata sandi wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    const startedAt = Date.now();

    try {
      const app = getApp();
      const authInstance = getAuth(app);
      await signInWithEmailAndPassword(authInstance, trimmedEmail, trimmedPassword);
      console.log("Login success in ms:", Date.now() - startedAt);
      router.replace("/starter/ask-location");
    } catch (e) {
      const error = e as { code?: string; message?: string };
      console.log("Login error:", error?.code, error?.message, e);
      Alert.alert(
        "Login gagal",
        "Periksa email/kata sandi dan koneksi internet, lalu coba lagi.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

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
          style={styles.image}
          source={require("@/assets/images/SeismoTrack_2-removebg-preview.png")}
          resizeMode="contain"
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          placeholder="email@gmail.com"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
        />

        <Text style={styles.label}>Kata Sandi</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            placeholder="********"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
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

        <TouchableOpacity
          onPress={() => router.push("/starter/forgot-password")}
        >
          <Text style={styles.forgotPassword}>Lupa Kata Sandi?</Text>
        </TouchableOpacity>

        <AuthButton
          title={isSubmitting ? "Memproses..." : "Login"}
          onPress={handleLogin}
          disabled={isSubmitting}
        />

        <Text style={styles.signUpText}>Belum Punya Akun?</Text>
        <TouchableOpacity onPress={() => router.push("/starter/register")}>
          <Text
            style={{ color: "#1E6F9F", fontWeight: "bold", textAlign: "right" }}
          >
            Daftar
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
    justifyContent: "center",
    minHeight: "100%",
  },
  image: {
    width: 250,
    height: 80,
    alignSelf: "center",
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 30,
    textAlign: "center",
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    paddingVertical: 8,
    color: "#111",
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
    color: "#111",
  },
  label: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 18,
  },
  forgotPassword: {
    textAlign: "right",
    color: "#1E6F9F",
    fontSize: 13,
    marginTop: 20,
    marginBottom: 10,
  },
  signUpText: {
    textAlign: "right",
    fontSize: 13,
    marginTop: 20,
    color: "#000000",
  },
});
