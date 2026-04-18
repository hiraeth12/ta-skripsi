/**
 * Test script untuk mengirim notifikasi gempa
 * Usage: npm run test:notification
 */

import { sendGempaDirasakanNotification } from "./fcm-notifications.js";
import { initializeAdmin } from "./firebase-admin-config.js";

async function testNotification() {
  try {
    console.log("🔧 Initializing Firebase Admin...");
    await initializeAdmin();
    
    console.log("📱 Sending test notification...");
    const result = await sendGempaDirasakanNotification(
      "Gempa dirasakan di Bandung, Jawa Barat", // headline
      "5.2",                                     // magnitude
      "Bandung, Jawa Barat",                    // location
      "10 km",                                   // depth
      new Date().toISOString()                  // timestamp
    );

    console.log("✅ Notification test completed!");
    console.log("Result:", result);
    process.exit(0);
  } catch (error) {
    console.error("❌ Error sending notification:", error);
    process.exit(1);
  }
}

testNotification();
