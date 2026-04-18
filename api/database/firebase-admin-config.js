/**
 * Firebase Admin SDK Configuration
 * Requires service account key for authentication
 */

import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db = null;

/**
 * Initialize Firebase Admin SDK
 * Supports multiple methods:
 * 1. FIREBASE_SERVICE_ACCOUNT_KEY env var (JSON string)
 * 2. FIREBASE_SERVICE_ACCOUNT_PATH env var (path to JSON file)
 * 3. firebase-service-account.json in project root
 * 4. google-services.json in project root (fallback)
 */
function initializeAdmin() {
  if (db) {
    return db;
  }

  let serviceAccount = null;

  // Method 1: Check environment variable as JSON string
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      console.log(
        "[Firebase Admin] Loaded service account from FIREBASE_SERVICE_ACCOUNT_KEY env var"
      );
    } catch (e) {
      console.error(
        "[Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:",
        e.message
      );
    }
  }

  // Method 2: Check environment variable as file path
  if (!serviceAccount && process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    try {
      const keyPath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
      serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf8"));
      console.log(
        `[Firebase Admin] Loaded service account from ${keyPath}`
      );
    } catch (e) {
      console.error(
        "[Firebase Admin] Failed to load from FIREBASE_SERVICE_ACCOUNT_PATH:",
        e.message
      );
    }
  }

  // Method 3: Check firebase-service-account.json in project root
  if (!serviceAccount) {
    try {
      const defaultPath = path.resolve(__dirname, "../../firebase-service-account.json");
      if (fs.existsSync(defaultPath)) {
        serviceAccount = JSON.parse(fs.readFileSync(defaultPath, "utf8"));
        console.log(
          "[Firebase Admin] Loaded service account from firebase-service-account.json"
        );
      }
    } catch (e) {
      console.error(
        "[Firebase Admin] Failed to load firebase-service-account.json:",
        e.message
      );
    }
  }

  // Method 4: Fallback to google-services.json (Android config)
  if (!serviceAccount) {
    try {
      const fallbackPath = path.resolve(__dirname, "../../android/app/google-services.json");
      if (fs.existsSync(fallbackPath)) {
        const googleServices = JSON.parse(fs.readFileSync(fallbackPath, "utf8"));
        // Extract basic info (not ideal, but can work for simple cases)
        console.warn(
          "[Firebase Admin] Using google-services.json as fallback - this is not recommended for backend services"
        );
        // This won't work for Admin SDK, so we skip
      }
    } catch (e) {
      // Ignore
    }
  }

  if (!serviceAccount) {
    throw new Error(
      `[Firebase Admin] Service account not found. Please:
1. Download service account key from Firebase Console
2. Save as 'firebase-service-account.json' in project root, OR
3. Set FIREBASE_SERVICE_ACCOUNT_KEY or FIREBASE_SERVICE_ACCOUNT_PATH env var`
    );
  }

  // Get database URL from environment or service account
  const databaseURL =
    process.env.FIREBASE_DATABASE_URL ||
    `https://${serviceAccount.project_id}-default-rtdb.asia-southeast1.firebasedatabase.app`;

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: databaseURL,
  });

  db = admin.database();
  console.log("[Firebase Admin] Successfully initialized with Admin SDK");

  return db;
}

function getDatabase() {
  if (!db) {
    return initializeAdmin();
  }
  return db;
}

export { admin, getDatabase, initializeAdmin };

