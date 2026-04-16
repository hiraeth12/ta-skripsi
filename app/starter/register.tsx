import AuthButton from "@/components/auth-button";
import { Ionicons } from "@expo/vector-icons";
import { getApp } from "@react-native-firebase/app";
import { createUserWithEmailAndPassword, getAuth } from "@react-native-firebase/auth";
import { getDatabase, ref, set } from "@react-native-firebase/database";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView, // Tambahkan ScrollView
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const FIREBASE_DATABASE_URL =
  process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL?.trim() || "";

export default function Register() {
  const router = useRouter();
  const [secure, setSecure] = useState(true);
  const [secureConfirm, setSecureConfirm] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const passwordsMatch = confirmPassword === "" || password === confirmPassword;

  const handleRegister = async () => {
    if (password !== confirmPassword) {
      Alert.alert("Kata sandi tidak cocok", "Pastikan kata sandi dan konfirmasi sama.");
      return;
    }

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();

    if (!trimmedEmail || !trimmedPassword || !trimmedFirstName || !trimmedLastName) {
      Alert.alert("Input belum lengkap", "Nama, email, dan kata sandi wajib diisi.");
      return;
    }

    try {
      const app = getApp();
      const authInstance = getAuth(app);
      const userCredential = await createUserWithEmailAndPassword(
        authInstance,
        trimmedEmail,
        trimmedPassword,
      );

      const uid = userCredential.user.uid;

      const database = FIREBASE_DATABASE_URL
        ? getDatabase(app, FIREBASE_DATABASE_URL)
        : getDatabase(app);
      await set(ref(database, `users/${uid}`), {
        email: trimmedEmail,
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        createdAt: Date.now(),
      });

      console.log("Register success:", uid, "databaseUrl:", FIREBASE_DATABASE_URL || "default");
      Alert.alert("Registrasi Berhasil", "Akun berhasil dibuat. Silakan login.", [
        {
          text: "OK",
          onPress: () => router.push('/starter/login'),
        },
      ]);
    } catch (e) {
      const error = e as { code?: string; message?: string };
      console.log("Register error:", error?.code, error?.message, e);
      Alert.alert(
        "Registrasi Gagal",
        `${error?.code || "error"}: ${error?.message || "Terjadi kesalahan saat membuat akun."}`,
      );
    }
  };

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
        <TextInput placeholder="Jane" placeholderTextColor="#999" style={styles.input} value={firstName} onChangeText={setFirstName} />
        

        <Text style={styles.label}>Nama Belakang</Text>
        <TextInput placeholder="Doe" placeholderTextColor="#999" style={styles.input} value={lastName} onChangeText={setLastName} />

        <Text style={styles.label}>Email</Text>
        <TextInput
          placeholder="email@gmail.com"
          placeholderTextColor="#999"
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>Kata Sandi</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            placeholder="********"
            placeholderTextColor="#999"
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
            placeholderTextColor="#999"
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
              handleRegister();
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
    justifyContent: "center",
    minHeight: "100%",
  },
  image: {
    width: 180,
    height: 59,
    alignSelf: "center",
    marginBottom: 30,
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
