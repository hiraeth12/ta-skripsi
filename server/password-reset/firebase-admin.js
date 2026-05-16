import fs from "fs";
import path from "path";
import admin from "firebase-admin";

function readServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    return JSON.parse(
      fs.readFileSync(path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH), "utf8"),
    );
  }

  const defaultPath = path.resolve(process.cwd(), "firebase-service-account.json");
  if (fs.existsSync(defaultPath)) {
    return JSON.parse(fs.readFileSync(defaultPath, "utf8"));
  }

  throw new Error(
    "Firebase service account not found. Set FIREBASE_SERVICE_ACCOUNT_KEY or FIREBASE_SERVICE_ACCOUNT_PATH.",
  );
}

export function initializePasswordResetAdmin() {
  if (!admin.apps.length) {
    const serviceAccount = readServiceAccount();
    const databaseURL =
      process.env.FIREBASE_DATABASE_URL ||
      `https://${serviceAccount.project_id}-default-rtdb.asia-southeast1.firebasedatabase.app`;

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL,
    });
  }

  return {
    admin,
    auth: admin.auth(),
    db: admin.database(),
  };
}
