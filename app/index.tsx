import { useRootNavigationState, useRouter } from "expo-router";
import { useEffect } from "react";
import { Image, View } from "react-native";

export default function Loading() {
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();

  useEffect(() => {
    if (!rootNavigationState?.key) return;

    const timer = setTimeout(() => {
      router.replace("/starter/sign-in");
    }, 2000);

    return () => clearTimeout(timer);
  }, [router, rootNavigationState?.key]);

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
