import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Image, View } from "react-native";

export default function Loading() {
  const router = useRouter();

  useEffect(() => {
    setTimeout(() => {
      router.replace("/starter/sign-in");
    }, 2000);
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Image
        source={require("../assets/images/SeismoTrack_2-removebg-preview.png")}
        style={{ width: 253, height: 83 }}
        resizeMode="contain"
      />
    </View>
  );
}
