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
    console.log('[FCM] === Starting FCM token save ===');
    console.log('[FCM] User ID:', userId);
    
    const app = getApp();
    console.log('[FCM] ✓ App instance obtained');
    
    const messaging = getMessaging(app);
    console.log('[FCM] ✓ Messaging instance obtained');

    // Request permission and get token
    console.log('[FCM] Requesting notification permission...');
    const authStatus = await requestPermission(messaging);
    console.log('[FCM] Permission status code:', authStatus);
    
    const enabled = 
      authStatus === AuthorizationStatus.AUTHORIZED ||
      authStatus === AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      console.warn('[FCM] ⚠️ FCM permission not granted, status:', authStatus);
      return null;
    }

    console.log('[FCM] Getting FCM token from device...');
    token = await getToken(messaging);
    if (!token) {
      console.warn('[FCM] ⚠️ Could not get FCM token');
      return null;
    }
    console.log('[FCM] ✓ Token obtained:', token.substring(0, 20) + '...');
    console.log('[FCM] Token length:', token.length);

    // Database save with detailed error reporting
    console.log('[FCM] Getting database instance...');
    const db = FIREBASE_DATABASE_URL
      ? getDatabase(app, FIREBASE_DATABASE_URL)
      : getDatabase(app);
    console.log('[FCM] ✓ Database instance obtained');
    
    const dbPath = `user_fcm_tokens/${userId}`;
    console.log('[FCM] Database path:', dbPath);
    
    const dbRef = ref(db, dbPath);
    console.log('[FCM] ✓ Database ref created');
    
    console.log('[FCM] Calling set() to write token...');
    startTime = Date.now();

    await withTimeout(set(dbRef, token), timeoutMs, 'FCM token database write');
    
    const duration = Date.now() - startTime;
    console.log(`✅ FCM Token saved successfully in ${duration}ms`);
    console.log('[FCM] Token path:', dbPath);
    return token;
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('[FCM] ❌ Error details:', {
      message: error?.message,
      code: error?.code,
      duration: duration + 'ms',
      hasToken: !!token,
      errorType: error?.constructor?.name,
    });
    
    if (token) {
      console.log('[FCM] ⚠️ Token retrieved but save failed. Returning token anyway.');
      console.log('[FCM] Debug: Token is:', token.substring(0, 20) + '...');
      return token;
    }
    return null;
  }
}
