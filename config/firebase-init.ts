import { getApp } from "@react-native-firebase/app";

let isInitialized = false;

export function initializeFirebase() {
  if (isInitialized) {
    console.log("[Firebase] Already initialized");
    return;
  }

  try {
    // React Native Firebase app is initialized natively via google-services.
    // We only probe to confirm readiness and avoid manual initializeApp() calls.
    getApp();
    console.log("[Firebase] App ready");
    isInitialized = true;
  } catch (error: any) {
    console.warn("[Firebase] App not ready yet:", error?.message ?? String(error));
    isInitialized = true;
  }
}

export { getApp };

