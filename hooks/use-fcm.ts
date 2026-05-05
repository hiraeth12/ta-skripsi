import { notificationEmitter } from "@/hooks/fcm-event-emitter";
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
          return;
        }

        const app = getApp();
        const messaging = getMessaging(app);

        // Request user permission for notifications
        const permission = await requestPermission(messaging);
        if (permission !== AuthorizationStatus.AUTHORIZED && permission !== AuthorizationStatus.PROVISIONAL) {
          return;
        }

        // Get FCM token
        const token = await getToken(messaging);
        tokenRef.current = token;

        // Register foreground listener only once
        if (!isForegroundListenerInitialized) {
          isForegroundListenerInitialized = true;
          onMessage(messaging, async (remoteMessage) => {
            console.log("FOREGROUND HANDLER TRIGGERED", remoteMessage.data);
            
            if (remoteMessage.data?.send_timestamp) {
              const latency = (Date.now() - parseInt(remoteMessage.data.send_timestamp, 10)) / 1000;
              console.log(`[LATENCY LOG] Notifikasi diterima dalam: ${latency.toFixed(3)} detik (Foreground)`);
            }

            // Karena kita menggunakan Data-Only Payload untuk background Wake-Up,
            // properti ada di remoteMessage.data
            const title = remoteMessage.data?.title || remoteMessage.notification?.title || "Notifikasi Gempa";
            const body = remoteMessage.data?.body || remoteMessage.notification?.body || "Ada gempa baru terdeteksi";
            
            notificationEmitter.emit({
              title,
              body,
            });
          });
        }
      } catch (error) {
      }
    };

    initializeMessaging();
  }, []);

  const getFcmToken = () => tokenRef.current;

  return { getFcmToken };
};
