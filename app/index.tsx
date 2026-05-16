import { useRootNavigationState, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated, Image, View } from "react-native";
import { loadStartupSession } from "@/features/account/session";

export default function Loading() {
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!rootNavigationState?.key) return;
    let cancelled = false;

    loadStartupSession().then((session) => {
      if (cancelled) return;
      Animated.timing(opacity, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (cancelled || !finished) return;
        router.replace(session.route);
      });
    });

    return () => {
      cancelled = true;
      opacity.stopAnimation();
    };
  }, [opacity, router, rootNavigationState?.key]);

  return (
    <Animated.View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        opacity,
      }}
    >
      <View>
        <Image
          source={require("../assets/images/SeismoTrack_2-removebg-preview.png")}
          style={{ width: 253, height: 83 }}
          resizeMode="contain"
        />
      </View>
    </Animated.View>
  );
}
