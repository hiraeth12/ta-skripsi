import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Text, View } from "react-native";

export default function Loading() {
  const router = useRouter();

  useEffect(() => {
    setTimeout(() => {
      router.replace("/starter/sign-in");
    }, 2000);
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Loading...</Text>
    </View>
  );
}
