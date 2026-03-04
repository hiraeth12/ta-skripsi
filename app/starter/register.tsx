import AuthButton from "@/components/auth-button";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function Register() {
  const [secure, setSecure] = useState(true);
  const [secureConfirm, setSecureConfirm] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const passwordsMatch = confirmPassword === "" || password === confirmPassword;
  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <Text style={styles.logo}>SeismoTrack</Text>

      <Text style={styles.label}>Nama Depan</Text>
      <TextInput placeholder="Jane" style={styles.input} />

      <Text style={styles.label}>Nama Belakang</Text>
      <TextInput placeholder="Doe" style={styles.input} />

      {/* Email */}
      <Text style={styles.label}>Email</Text>
      <TextInput
        placeholder="email@gmail.com"
        keyboardType="email-address"
        style={styles.input}
      />

      {/* Password */}
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

      {/* Confirm Password */}
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
          disabled={!passwordsMatch}
          onPress={() => {
            console.log("Register pressed");
          }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#EDEDED",
  },
  logo: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 50,
    color: "#1E6F9F",
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
});
