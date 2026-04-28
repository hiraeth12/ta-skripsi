import { ensureNotificationPermission } from "@/hooks/notification-permission";
import { getApp } from "@react-native-firebase/app";
import {
    AuthorizationStatus,
    getMessaging,
    getToken,
    onMessage,
    requestPermission,
} from "@react-native-firebase/messaging";
import { useEffect, useRef } from "react";
import { Alert } from "react-native";

// Global flag to ensure foreground listener is registered only once
let isForegroundListenerInitialized = false;

/**
 * Initialize Firebase Cloud Messaging for push notifications
 * Uses modular Firebase API (v22+ compatible)
 * Background handler is already registered in index.js at app startup
 */
export const useFcm = () => {
  const tokenRef = useRef<string | null>(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    const initializeMessaging = async () => {
      try {
        const notificationAllowed = await ensureNotificationPermission();
        if (!notificationAllowed) {
          console.log("Android notification permission denied");
          return;
        }

        const app = getApp();
        const messaging = getMessaging(app);

        // Request user permission for notifications
        const permission = await requestPermission(messaging);
        if (permission === AuthorizationStatus.AUTHORIZED) {
          console.log("User granted notification permission");
        } else if (permission === AuthorizationStatus.PROVISIONAL) {
          console.log("User granted provisional notification permission");
        } else {
          console.log("User denied notification permission");
          return;
        }

        // Get FCM token
        const token = await getToken(messaging);
        tokenRef.current = token;
        console.log("FCM Token:", token);

        // Register foreground listener only once
        if (!isForegroundListenerInitialized) {
          isForegroundListenerInitialized = true;
          onMessage(messaging, async (remoteMessage) => {
            console.log("Foreground notification received:", remoteMessage?.messageId);
            if (remoteMessage.notification) {
              Alert.alert(
                remoteMessage.notification.title || "Notifikasi Gempa",
                remoteMessage.notification.body || "Ada gempa baru terdeteksi",
              );
            }
          });
        }
      } catch (error) {
        console.error("Error initializing FCM:", error);
      }
    };

    initializeMessaging();
  }, []);

  const getFcmToken = () => tokenRef.current;

  return { getFcmToken };
};
