import AuthButton from "@/components/auth-button";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
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

export default function VerifyCode() {
  const router = useRouter();
  const [code, setCode] = useState(["", "", "", ""]);
  const [timer, setTimer] = useState(30);
  const inputRefs = useRef<TextInput[]>([]);

  // Timer Countdown Logic
  useEffect(() => {
    if (timer === 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const formatTime = (seconds: number) => {
    return `00:${seconds < 10 ? `0${seconds}` : seconds}`;
  };

  const handleInput = (text: string, index: number) => {
    const newCode = [...code];
    // Hanya ambil karakter terakhir jika user mengetik cepat
    const cleanText = text.replace(/[^0-9]/g, "");
    newCode[index] = cleanText.slice(-1);
    setCode(newCode);

    // Otomatis pindah ke kanan jika diisi
    if (cleanText.length === 1 && index < 3) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Otomatis pindah ke kiri jika dihapus saat kotak kosong
    if (e.nativeEvent.key === "Backspace" && code[index] === "" && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

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

        <Image
          style={styles.image}
          source={require("@/assets/images/Forgot password-bro 2.png")}
          resizeMode="contain"
        />

        <Text style={styles.title}>Verifikasi Alamat Email</Text>
        <Text style={styles.subtitle}>
          Kode verifikasi telah dikirim ke:{"\n"}
          <Text style={styles.emailText}>email@gmail.com</Text>
        </Text>

        <View style={styles.otpContainer}>
          {code.map((digit, index) => (
            <View key={index} style={styles.inputWrapper}>
              <TextInput
                ref={(ref) => {
                  inputRefs.current[index] = ref as TextInput;
                }}
                style={styles.input}
                maxLength={1}
                keyboardType="number-pad"
                selectionColor="#1E6F9F" // Warna kursor | di tengah
                onChangeText={(text) => handleInput(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                value={digit}
                placeholder="" // Placeholder kosong agar tidak menimpa garis bawah
              />
              {/* Garis bawah kustom yang tidak hilang saat ada angka */}
              <View
                style={[
                  styles.underline,
                  digit ? styles.underlineActive : styles.underlineInactive,
                ]}
              />
            </View>
          ))}
        </View>

        <AuthButton
          title="Konfirmasi Kode"
          onPress={() => router.push("/starter/new-password")}
        />

        <TouchableOpacity
          disabled={timer !== 0}
          onPress={() => setTimer(30)}
          style={{ marginTop: 25 }}
        >
          <Text style={styles.resendText}>
            {timer > 0 ? (
              <>
                Kirim ulang kode dalam{" "}
                <Text style={{ fontWeight: "bold" }}>{formatTime(timer)}</Text>
              </>
            ) : (
              <Text style={{ color: "#1E6F9F", fontWeight: "bold" }}>
                Kirim Ulang Kode
              </Text>
            )}
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
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100%",
  },
  logo: {
    width: 160,
    height: 50,
    alignSelf: "center",
    marginBottom: 10,
    marginTop: 20,
  },
  image: {
    width: 220,
    height: 220,
    alignSelf: "center",
    marginBottom: 15,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#000",
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    color: "#666",
    marginBottom: 30,
    lineHeight: 20,
  },
  emailText: {
    fontWeight: "bold",
    color: "#333",
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    width: "100%",
    paddingHorizontal: 10,
    marginBottom: 35,
  },
  inputWrapper: {
    width: 55, // Ukuran kotak lebih proporsional
    height: 70,
    borderWidth: 2,
    borderColor: "#1E6F9F",
    borderRadius: 12,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  input: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    width: "100%",
    height: "100%",
    color: "#1E6F9F",
    padding: 0, // Penting agar kursor benar-benar di tengah
  },
  underline: {
    position: "absolute",
    bottom: 12,
    width: 18,
    height: 2,
    borderRadius: 1,
  },
  underlineInactive: {
    backgroundColor: "#ccc",
  },
  underlineActive: {
    backgroundColor: "#1E6F9F",
  },
  resendText: {
    color: "#555",
    fontSize: 14,
    marginBottom: 20,
  },
});
