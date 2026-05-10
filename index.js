// Initialize Firebase FIRST - before anything else
import { initializeFirebase } from "./config/firebase-init";
initializeFirebase();

import { registerFcmBackgroundHandler } from "./hooks/fcm-background-handler";
registerFcmBackgroundHandler();

import "expo-router/entry";

