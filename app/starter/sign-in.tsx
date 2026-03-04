import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import AuthButton from "@/components/auth-button";

export default function SignIn() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gooner App 💦</Text>

      <AuthButton
        title="Masuk"
        onPress={() => router.push("/starter/login")}
      />

      <AuthButton
        title="Daftar"
        onPress={() => router.push("/starter/register")}
      />
    </View>
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
    marginBottom: 128,
    textAlign: "center",
  },
});