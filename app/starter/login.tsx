import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
} from "react-native";

import AuthButton from "@/components/auth-button";

export default function Login() {
  const router = useRouter();
  const [secure, setSecure] = useState(true);

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <Text style={styles.title}>Welcome Back 👋</Text>

      <Text style={styles.label}>Email</Text>
      <TextInput
        placeholder="email@gmail.com"
        keyboardType="email-address"
        style={styles.input}
      />

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

      <TouchableOpacity>
        <Text style={styles.forgotPassword}>Lupa Kata Sandi?</Text>
      </TouchableOpacity>

      <AuthButton
        title="Login"
        onPress={() => router.push("/starter/ask-location")}
      />
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
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 32,
    textAlign: "center",
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
  button: {
    marginTop: 20,
    backgroundColor: "#1E6F9F", 
    borderRadius: 10,
    width: "65%", 
    height: 50, 
    alignSelf: "center", 
    justifyContent: "center", 
    alignItems: "center", 
  },

  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
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
});
