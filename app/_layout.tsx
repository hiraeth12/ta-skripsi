import { GempaBumiNotificationModal } from "@/components/ui/GempaBumiNotificationModal";
import { InAppNotificationData } from "@/components/ui/in-app-notification-modal";
import { notificationEmitter } from "@/hooks/fcm-event-emitter";
import notifee from "@notifee/react-native";
import { Stack, useSegments } from "expo-router";
import { useEffect, useState } from "react";

export default function RootLayout() {
  const [notification, setNotification] = useState<InAppNotificationData | null>(null);
  const segments = useSegments();
  
  // Deteksi apakah saat ini sedang berada di folder/layar starter (auth)
  const isStarter = segments[0] === "starter";

  // Extract magnitude and depth if available from body or set defaults
  const getMagInfo = (body?: string) => {
    if (!body) return { mag: "-", depth: "-" };
    const magMatch = body.match(/M(?:agnitudo|ag)?\s*:\s*([0-9.]+)/i) || body.match(/M(?:agnitudo)?\s*([0-9.]+)/i);
    const depthMatch = body.match(/(?:Kedalaman|kedlmn)\s*:\s*([0-9.]+)/i);
    return {
      mag: magMatch ? magMatch[1] : "-",
      depth: depthMatch ? depthMatch[1] + " km" : "-",
    };
  };

  const { mag, depth } = getMagInfo(notification?.body);

  useEffect(() => {
    // 1. Subscribe to events (Foreground)
    const unsubscribe = notificationEmitter.subscribe((payload) => {
      setNotification(payload);
    });

    // 2. Check if App was launched via Notification or Full Screen Intent (Background/Killed state)
    const checkInitialNotification = async () => {
      try {
        const initialNotification = await notifee.getInitialNotification();
        if (initialNotification?.notification) {
          setNotification({
            title: initialNotification.notification.title || "Peringatan Gempa Bumiii!",
            body: initialNotification.notification.body || "",
          });
        }
      } catch (e) {
        console.error("Error reading initial notification", e);
      }
    };
    checkInitialNotification();

    return () => unsubscribe();
  }, []);

  return (
    <>
      <Stack screenOptions={{ headerShown: false, animation: "none" }} />
      <GempaBumiNotificationModal 
        visible={!!notification && !isStarter} 
        magnitudo={mag}
        kedalaman={depth}
        closeInSecond={6}
        onClose={() => setNotification(null)} 
      />
    </>
  );
}
