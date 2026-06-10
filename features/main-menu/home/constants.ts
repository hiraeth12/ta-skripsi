import { Dimensions } from "react-native";

export const { width: SCREEN_WIDTH } = Dimensions.get("window");

export const DIRASAKAN_API_URL =
  process.env.EXPO_PUBLIC_GEMPA_DIRASAKAN_API_URL ?? "";
export const TERDETEKSI_API_URL_FAST =
  process.env.EXPO_PUBLIC_GEMPA_TERDETEKSI_API_URL_FAST ?? "";
export const TSUNAMI_API_URL =
  process.env.EXPO_PUBLIC_PERINGATAN_TSUNAMI_API_URL ?? "";
export const DB_URL =
  process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL?.trim() ?? "";
