import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db = null;

function initializeAdmin() {
  if (db) {
    return db;
  }

  let serviceAccount = null;

  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    } catch (e) {}
  }

  if (!serviceAccount && process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    try {
      const keyPath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
      serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf8"));
    } catch (e) {}
  }

  if (!serviceAccount) {
    try {
      const defaultPath = path.resolve(
        __dirname,
        "../firebase-service-account.json",
      );
      if (fs.existsSync(defaultPath)) {
        serviceAccount = JSON.parse(fs.readFileSync(defaultPath, "utf8"));
      }
    } catch (e) {}
  }

  if (!serviceAccount) {
    try {
      const fallbackPath = path.resolve(
        __dirname,
        "../android/app/google-services.json",
      );
      if (fs.existsSync(fallbackPath)) {
        const googleServices = JSON.parse(
          fs.readFileSync(fallbackPath, "utf8"),
        );
      }
    } catch (e) {
    }
  }

  if (!serviceAccount) {
    throw new Error(
      `[Firebase Admin] Service account not found. Please:
1. Download service account key from Firebase Console
2. Save as 'firebase-service-account.json' in project root, OR
3. Set FIREBASE_SERVICE_ACCOUNT_KEY or FIREBASE_SERVICE_ACCOUNT_PATH env var`,
    );
  }

  const databaseURL =
    process.env.FIREBASE_DATABASE_URL ||
    `https://${serviceAccount.project_id}-default-rtdb.asia-southeast1.firebasedatabase.app`;

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: databaseURL,
  });

  db = admin.database();

  return db;
}

function getDatabase() {
  if (!db) {
    return initializeAdmin();
  }
  return db;
}

export { admin, getDatabase, initializeAdmin };
