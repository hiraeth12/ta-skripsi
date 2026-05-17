import * as SplashScreen from "expo-splash-screen";
import { initializeFirebase } from "./config/firebase-init";
import { configureMapbox } from "./config/mapbox";
import { registerFcmBackgroundHandler } from "./hooks/fcm-background-handler";

SplashScreen.preventAutoHideAsync().catch(() => {});

// Initialize native services before Expo Router mounts the app tree.
initializeFirebase();
configureMapbox();
registerFcmBackgroundHandler();

require("expo-router/entry");

