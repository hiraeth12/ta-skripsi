import { checkAndNotifyNewGempaDirasakan } from "./fcm-notifications.js";
import { getDatabase, initializeAdmin } from "./firebase-admin-config.js";

const MIN_CHECK_MS = 10_000;
const MAX_CHECK_MS = 120_000;

/**
 * Monitor gempa dirasakan API and send push notifications
 * Run this as a background process or scheduled task
 * @returns {Promise<void>}
 */
export async function monitorGempaDirasakanAndNotify() {
  try {
    // Initialize Firebase Admin
    await initializeAdmin();

    const db = getDatabase();
    let lastKnownEventId = null;
    let checkDelayMs = MIN_CHECK_MS;

    async function checkAndNotify() {
      try {
        const newEventId = await checkAndNotifyNewGempaDirasakan(lastKnownEventId);

        if (newEventId) {
          lastKnownEventId = newEventId;

          // Store last event ID in database
          await db.ref("notification_state/last_gempa_dirasakan_event").set({
            eventId: newEventId,
            timestamp: Date.now(),
          });

          checkDelayMs = MIN_CHECK_MS;
        } else {
          checkDelayMs = Math.min(checkDelayMs + 10_000, MAX_CHECK_MS);
        }
      } catch (error) {
        console.error("Error in check and notify cycle:", error);
        checkDelayMs = Math.min(checkDelayMs + 10_000, MAX_CHECK_MS);
      }
    }

    // Load last known event ID
    try {
      const snapshot = await db
        .ref("notification_state/last_gempa_dirasakan_event")
        .get();
      if (snapshot.exists()) {
        lastKnownEventId = snapshot.val()?.eventId || null;
      }
    } catch (error) {
      console.log("Could not load last event ID:", error);
    }

    console.log("Starting gempa dirasakan notification monitor...");

    // Initial check
    await checkAndNotify();

    // Schedule recurring checks
    setInterval(checkAndNotify, checkDelayMs);
  } catch (error) {
    console.error("Fatal error in monitorGempaDirasakanAndNotify:", error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1].endsWith("monitor-gempa-notifications.js")) {
  monitorGempaDirasakanAndNotify().catch(err => {
    console.error("Monitor crashed:", err);
    process.exit(1);
  });
}
