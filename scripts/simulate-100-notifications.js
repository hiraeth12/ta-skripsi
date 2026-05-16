import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { initializeAdmin } from "./firebase-admin-config.js";

function readEnvFile(envPath) {
  const raw = fs.readFileSync(envPath, "utf8");
  const lines = raw.split(/\r?\n/);
  const env = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex < 0) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    env[key] = value;
  }
  return env;
}

async function simulate100Notifications() {
  try {
    console.log("[simulate-100] Initializing Firebase Admin...");
    await initializeAdmin();

    const envPath = path.resolve(process.cwd(), ".env");
    const envVars = readEnvFile(envPath);

    const db = admin.database();
    
    console.log("[simulate-100] Fetching test device group tokens...");
    const tokensSnapshot = await db.ref("user_fcm_tokens").get();
    const tokens = [];

    if (tokensSnapshot.exists()) {
      const tokenData = tokensSnapshot.val();
      for (const userId in tokenData) {
        const entry = tokenData[userId];
        const tokenValue =
          typeof entry === "string"
            ? entry
            : typeof entry?.token === "string"
              ? entry.token
              : null;
        if (tokenValue) {
          tokens.push(tokenValue);
        }
      }
    }

    const uniqueTokens = Array.from(new Set(tokens));
    if (uniqueTokens.length === 0) {
      console.log("[simulate-100] Error: No tokens found in user_fcm_tokens database.");
      process.exit(1);
    }
    
    console.log(`[simulate-100] Found ${uniqueTokens.length} unique test device tokens.`);
    
    // Prepare 100 messages distributed to the tokens mapping
    const TOTAL_NOTIFICATIONS = 100;
    const messages = [];
    
    for (let i = 0; i < TOTAL_NOTIFICATIONS; i++) {
        const token = uniqueTokens[i % uniqueTokens.length];
        messages.push({
            android: {
                priority: "high",
            },
            data: {
                type: "gempa_dirasakan",
                headline: `Test Simulasi Gempa #${i + 1}`,
                magnitude: "5.5",
                location: "Selatan Jawa",
                depth: "10 km",
                timestamp: new Date().toISOString(),
                title: "Peringatan Gempa Bumi ! (Simulasi)",
                body: `(Simulasi ${i + 1}/${TOTAL_NOTIFICATIONS}) Gempa Magnitudo 5.5`,
                send_timestamp: String(Date.now()),
            },
            token: token,
        });
    }

    console.log(`[simulate-100] Sending ${messages.length} notifications...`);
    
    let successCount = 0;
    let failureCount = 0;
    let deliveryStatuses = [];

    // Send using sendEach
    const response = await admin.messaging().sendEach(messages);

    response.responses.forEach((resp, index) => {
        const status = resp.success ? "SUCCESS" : `FAILED: ${resp.error?.code || resp.error?.message}`;
        deliveryStatuses.push(`Msg ${index + 1}: ${status}`);
        if (resp.success) {
            successCount++;
        } else {
            failureCount++;
        }
    });

    console.log("\n--- DELIVERY STATUS LOG ---");
    deliveryStatuses.forEach(status => console.log(status));
    console.log("---------------------------\n");

    const totalSent = TOTAL_NOTIFICATIONS;
    const successRate = (successCount / totalSent) * 100;

    console.log(`[simulate-100] Simulation Completed.`);
    console.log(`Total Sent: ${totalSent}`);
    console.log(`Successfully Delivered: ${successCount}`);
    console.log(`Failed: ${failureCount}`);
    console.log(`Success Rate: ${successRate.toFixed(2)}%`);
    
    process.exit(0);
  } catch (error) {
    console.error("[simulate-100] Fatal error:", error);
    process.exit(1);
  }
}

simulate100Notifications();