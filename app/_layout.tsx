import { GempaBumiNotificationModal } from "@/features/main-menu/notifications/components/GempaBumiNotificationModal";
import { TsunamiAlertNotificationModal } from "@/features/main-menu/notifications/components/tsunami-alert-notification-modal";
import { setLogoutTransitionRunner } from "@/features/main-menu/account/components/logout-transition";
import { notificationEmitter } from "@/services/fcm-event-emitter";
import {
  normalizeNotificationPayload,
  type NormalizedGempaNotification,
  type NormalizedTsunamiNotification,
} from "@/services/notification-payload";
import { useFcm } from "@/hooks/use-fcm";
import notifee from "@notifee/react-native";
import { Stack, useSegments } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, InteractionManager, StyleSheet } from "react-native";

function FcmBootstrap() {
  useFcm();
  return null;
}

function getText(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || undefined;
  }

  if (value === null || value === undefined) return undefined;

  const trimmed = String(value).trim();
  return trimmed || undefined;
}

function formatDepth(value: string): string {
  return /km/i.test(value) ? value : `${value} km`;
}

function waitForNextFrame() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });
}

function LogoutTransitionOverlay() {
  const opacity = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(false);

  const animateOpacity = useCallback(
    (toValue: number, duration: number) =>
      new Promise<void>((resolve) => {
        Animated.timing(opacity, {
          toValue,
          duration,
          useNativeDriver: true,
        }).start(() => resolve());
      }),
    [opacity],
  );

  useEffect(() => {
    return setLogoutTransitionRunner(async (action) => {
      let didLogout = false;

      setVisible(true);
      await animateOpacity(1, 180);

      try {
        didLogout = await action();
      } finally {
        await waitForNextFrame();
        await waitForNextFrame();
        await animateOpacity(0, 220);
        setVisible(false);
      }

      return didLogout;
    });
  }, [animateOpacity]);

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="auto"
      style={[styles.logoutTransitionOverlay, { opacity }]}
    />
  );
}

export default function RootLayout() {
  const [gempaNotification, setGempaNotification] =
    useState<NormalizedGempaNotification | null>(null);
  const [tsunamiNotification, setTsunamiNotification] =
    useState<NormalizedTsunamiNotification | null>(null);
  const [fcmReady, setFcmReady] = useState(false);
  const segments = useSegments();

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setFcmReady(true);
    });
    return () => task.cancel();
  }, []);
  
  // Deteksi apakah saat ini sedang berada di folder/layar starter (auth)
  const isStarter = segments[0] === "starter";

  const showNotification = useCallback(
    (payload: Parameters<typeof normalizeNotificationPayload>[0]) => {
      const normalized = normalizeNotificationPayload(payload);

      if (normalized.kind === "tsunami_alert") {
        setGempaNotification(null);
        setTsunamiNotification(normalized);
        return;
      }

      setTsunamiNotification(null);
      setGempaNotification(normalized);
    },
    [],
  );

  // Extract magnitude and depth if available from data or body.
  const getMagInfo = (notification?: NormalizedGempaNotification | null) => {
    const data = notification?.data;
    const dataMagnitude = getText(data?.magnitude ?? data?.mag);
    const dataDepth = getText(data?.depth ?? data?.kedalaman);
    const body = notification?.body;

    if (dataMagnitude || dataDepth) {
      return {
        mag: dataMagnitude ?? "-",
        depth: dataDepth ? formatDepth(dataDepth) : "-",
      };
    }

    if (!body) return { mag: "-", depth: "-" };
    const magMatch =
      body.match(/M(?:agnitudo|ag)?\s*:\s*([0-9.]+)/i) ||
      body.match(/M(?:agnitudo)?\s*([0-9.]+)/i);
    const depthMatch = body.match(/(?:Kedalaman|kedlmn)\s*:\s*([0-9.]+)/i);
    return {
      mag: magMatch ? magMatch[1] : "-",
      depth: depthMatch ? depthMatch[1] + " km" : "-",
    };
  };

  const { mag, depth } = getMagInfo(gempaNotification);

  useEffect(() => {
    // 1. Subscribe to events (Foreground)
    const unsubscribe = notificationEmitter.subscribe((payload) => {
      showNotification(payload);
    });

    // 2. Check if App was launched via Notification or Full Screen Intent (Background/Killed state)
    const checkInitialNotification = async () => {
      try {
        const initialNotification = await notifee.getInitialNotification();
        if (initialNotification?.notification) {
          showNotification({
            title:
              initialNotification.notification.title ||
              "Peringatan Gempa Bumiii!",
            body: initialNotification.notification.body || "",
            data: initialNotification.notification.data,
          });
        }
      } catch (e) {
        console.error("Error reading initial notification", e);
      }
    };
    checkInitialNotification();

    return () => unsubscribe();
  }, [showNotification]);

  return (
    <>
      {fcmReady && <FcmBootstrap />}
      <Stack screenOptions={{ headerShown: false, animation: "none" }} />
      <GempaBumiNotificationModal 
        visible={!!gempaNotification && !isStarter} 
        magnitudo={mag}
        kedalaman={depth}
        closeInSecond={6}
        onClose={() => setGempaNotification(null)} 
      />
      <TsunamiAlertNotificationModal
        visible={!!tsunamiNotification && !isStarter}
        level={tsunamiNotification?.level}
        message={tsunamiNotification?.message}
        closeInSecond={6}
        onClose={() => setTsunamiNotification(null)}
      />
      <LogoutTransitionOverlay />
    </>
  );
}

const styles = StyleSheet.create({
  logoutTransitionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#ffffff",
    elevation: 999,
    zIndex: 999,
  },
});
