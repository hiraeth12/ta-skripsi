// Initialize Firebase FIRST - before anything else
import { initializeFirebase } from "./config/firebase-init";
import { configureMapbox } from "./config/mapbox";
import { registerFcmBackgroundHandler } from "./hooks/fcm-background-handler";

initializeFirebase();
configureMapbox();
registerFcmBackgroundHandler();

require("expo-router/entry");

