import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp } from "@react-native-firebase/app";
import { getAuth, signOut } from "@react-native-firebase/auth";
import { getDatabase, ref, remove } from "@react-native-firebase/database";
import { deleteToken, getMessaging } from "@react-native-firebase/messaging";
import type { Router } from "expo-router";
import { CACHE_KEYS, clearCache } from "@/utils/cache";
import { runLogoutTransition } from "./logout-transition";

export const PUSH_NOTIFICATION_PREF_KEY = "push_notifications_enabled";

export async function handleLogout(router: Router) {
  return runLogoutTransition(async () => {
    try {
      const app = getApp();
      const auth = getAuth(app);
      const user = auth.currentUser;

      if (user) {
        const messaging = getMessaging(app);
        const dbUrl = process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL;
        const db = dbUrl ? getDatabase(app, dbUrl) : getDatabase(app);

        try {
          await deleteToken(messaging);
        } catch {
          // Database cleanup is the source of truth for this user session.
        }

        await remove(ref(db, `user_fcm_tokens/${user.uid}`));
      }

      await AsyncStorage.setItem(PUSH_NOTIFICATION_PREF_KEY, "false");
      clearCache(CACHE_KEYS.USER_PROFILE);
      clearCache(CACHE_KEYS.USER_LOCATION);
      await signOut(auth);
      router.replace("/starter/sign-in");
      return true;
    } catch {
      return false;
    }
  });
}
