import { getApp } from "@react-native-firebase/app";
import { getMessaging, setBackgroundMessageHandler } from "@react-native-firebase/messaging";

let isBackgroundHandlerRegistered = false;

/**
 * Register background handler once at app startup.
 * This must be called before Firebase messaging is used.
 * Called from index.js (main entry point) only.
 */
export function registerFcmBackgroundHandler() {
  if (isBackgroundHandlerRegistered) return;

  try {
    const app = getApp();
    const messaging = getMessaging(app);

    setBackgroundMessageHandler(messaging, async (remoteMessage) => {
      console.log("[FCM Background] Notification received:", remoteMessage?.messageId);
      // Background handler processes notification automatically
      // No need to show alert here - Firebase handles the tray notification
    });

    isBackgroundHandlerRegistered = true;
    console.log("[FCM] Background message handler registered successfully");
  } catch (error) {
    console.warn("[FCM] Failed to register background handler:", error);
  }
}
