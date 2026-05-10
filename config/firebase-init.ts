import { getApp } from "@react-native-firebase/app";

let isInitialized = false;

export function initializeFirebase() {
  if (isInitialized) {
    return;
  }

  try {
    // React Native Firebase app is initialized natively via google-services.
    // We only probe to confirm readiness and avoid manual initializeApp() calls.
    getApp();
    isInitialized = true;
  } catch (error: any) {
    isInitialized = true;
  }
}

export { getApp };

