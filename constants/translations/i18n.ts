import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json"; // Sesuaikan path jika berbeda
import id from "./id.json"; // Sesuaikan path jika berbeda

export const STORE_LANGUAGE_KEY = "appLanguage";

const i18n = createInstance();

i18n.use(initReactI18next).init({
  compatibilityJSON: "v4",
  resources: {
    id: { translation: id },
    en: { translation: en },
  },
  lng: "id", // Default awal
  fallbackLng: "id",
  interpolation: {
    escapeValue: false,
  },
});

// Load bahasa yang tersimpan saat aplikasi pertama kali dibuka
AsyncStorage.getItem(STORE_LANGUAGE_KEY).then((savedLang) => {
  if (savedLang) {
    i18n.changeLanguage(savedLang);
  } else {
    // Jika belum ada yang disimpan, cek bahasa bawaan HP
    const deviceLang = Localization.getLocales()[0]?.languageCode;
    if (deviceLang === "en" || deviceLang === "id") {
      i18n.changeLanguage(deviceLang);
    }
  }
});

export default i18n;
