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
      // Background handler processes notification automatically
      // No need to show alert here - Firebase handles the tray notification
    });

    isBackgroundHandlerRegistered = true;
  } catch (error) {
  }
}
