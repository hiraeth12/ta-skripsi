import { styles } from "../../features/starter/styles/new-password-styles";
import AuthButton from "@/components/auth-button";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function NewPassword() {
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
          style={styles.label}
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
