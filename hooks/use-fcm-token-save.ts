import { ensureNotificationPermission } from '@/hooks/notification-permission';
import { getApp } from '@react-native-firebase/app';
import { getDatabase, ref, set } from '@react-native-firebase/database';
import {
    AuthorizationStatus,
    getMessaging,
    getToken,
    requestPermission,
} from '@react-native-firebase/messaging';

const FIREBASE_DATABASE_URL =
  process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL?.trim() || '';

type SaveFcmTokenOptions = {
  timeoutMs?: number;
};

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`${label} timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

/**
 * Save user's FCM token to Firebase Realtime Database
 * Called after successful login
 * Uses modular Firebase API (v22+ compatible)
 * @param userId - User ID from Firebase Auth
 * @returns Promise with token info
 */
export async function saveFcmTokenToDatabase(userId: string) {
  let token: string | null = null;
  let startTime = Date.now();
  const timeoutMs = 15000;
  
  try {
    const notificationAllowed = await ensureNotificationPermission();
    if (!notificationAllowed) {
      return null;
    }
    
    const app = getApp();
    
    const messaging = getMessaging(app);

    // Request permission and get token
    const authStatus = await requestPermission(messaging);
    
    const enabled = 
      authStatus === AuthorizationStatus.AUTHORIZED ||
      authStatus === AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      return null;
    }

    token = await getToken(messaging);
    if (!token) {
      return null;
    }

    // Database save with detailed error reporting
    const db = FIREBASE_DATABASE_URL
      ? getDatabase(app, FIREBASE_DATABASE_URL)
      : getDatabase(app);
    
    const dbPath = `user_fcm_tokens/${userId}`;
    
    const dbRef = ref(db, dbPath);
    startTime = Date.now();

    await withTimeout(
      set(dbRef, {
        token,
        updatedAt: Date.now(),
      }),
      timeoutMs,
      'FCM token database write',
    );
    
    return token;
    
  } catch (error: any) {
    if (token) {
      return token;
    }
    return null;
  }
}
