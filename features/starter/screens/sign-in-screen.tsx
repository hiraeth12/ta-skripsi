import AuthButton from "@/components/auth-button";
import { useRouter } from "expo-router";
import { Image, View } from "react-native";
import { styles } from "../styles/sign-in-styles";

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

