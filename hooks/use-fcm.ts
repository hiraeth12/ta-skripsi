import { getApp } from "@react-native-firebase/app";
import {
    AuthorizationStatus,
    getInitialNotification,
    getMessaging,
    getToken,
    onMessage,
    onNotificationOpenedApp,
    requestPermission,
} from "@react-native-firebase/messaging";
import { useEffect, useRef } from "react";
import { Alert } from "react-native";

/**
 * Initialize Firebase Cloud Messaging for push notifications
 * Uses modular Firebase API (v22+ compatible)
 */
export const useFcm = () => {
  const tokenRef = useRef<string | null>(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    const initializeMessaging = async () => {
      try {
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

        // Save token to database for later use (optional)
        // await saveTokenToDatabase(token);
      } catch (error) {
        console.error("Error requesting notification permission:", error);
      }
    };

    initializeMessaging();

    // Handle foreground notifications
    const app = getApp();
    const messaging = getMessaging(app);
    
    const unsubscribe = onMessage(messaging, async (remoteMessage) => {
      console.log("Foreground notification received:", remoteMessage);

      if (remoteMessage.notification) {
        Alert.alert(
          remoteMessage.notification.title || "Notifikasi Gempa",
          remoteMessage.notification.body || "Ada gempa baru terdeteksi",
        );
      }
    });

    // Handle background notification tap
    onNotificationOpenedApp(messaging, (remoteMessage) => {
      console.log(
        "Notification opened app from background:",
        remoteMessage,
      );
      if (remoteMessage?.data) {
        // Handle navigation based on data
      }
    });

    // Handle notification when app is quit
    getInitialNotification(messaging).then((remoteMessage) => {
      if (remoteMessage) {
        console.log(
          "Notification caused app to open from quit state:",
          remoteMessage,
        );
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const getFcmToken = () => tokenRef.current;

  return { getFcmToken };
};
