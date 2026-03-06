import AuthButton from "@/components/auth-button";
import { useRouter } from "expo-router";
import { Image, StyleSheet, View } from "react-native";

export default function SignIn() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Image
        style={styles.image}
        source={require("@/assets/images/SeismoTrack_2-removebg-preview.png")}
        resizeMode="contain"
      />

      <View style={styles.buttonContainer}>
        <AuthButton
          title="Masuk"
          onPress={() => router.push("/starter/login")}
        />
        <View style={{ height: 14 }} />
        <AuthButton
          title="Daftar"
          onPress={() => router.push("/starter/register")}
        />
      </View>
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
  image: {
    width: 250,
    height: 80,
    alignSelf: "center",
    marginBottom: 150,
  },
  buttonContainer: {
    width: "100%",
    alignItems: "center",
  },
});
