import { checkAndNotifyNewTsunami } from "./fcm-notifications.js";
import { getDatabase, initializeAdmin } from "./firebase-admin-config.js";

const MIN_CHECK_MS = 10_000;
const MAX_CHECK_MS = 120_000;

export async function monitorTsunamiAndNotify() {
  try {
    await initializeAdmin();

    const db = getDatabase();
    let lastKnownWarningId = null;
    let checkDelayMs = MIN_CHECK_MS;
    let timer = null;

    async function checkAndNotify() {
      try {
        const newWarningId = await checkAndNotifyNewTsunami(lastKnownWarningId);

        if (newWarningId) {
          lastKnownWarningId = newWarningId;

          await db.ref("notification_state/last_tsunami_warning").set({
            warningId: newWarningId,
            timestamp: Date.now(),
          });

          checkDelayMs = MIN_CHECK_MS;
        } else {
          checkDelayMs = Math.min(checkDelayMs + 10_000, MAX_CHECK_MS);
        }
      } catch {
        checkDelayMs = Math.min(checkDelayMs + 10_000, MAX_CHECK_MS);
      } finally {
        timer = setTimeout(checkAndNotify, checkDelayMs);
      }
    }

    try {
      const snapshot = await db
        .ref("notification_state/last_tsunami_warning")
        .get();
      if (snapshot.exists()) {
        lastKnownWarningId = snapshot.val()?.warningId || null;
      }
    } catch {}

    await checkAndNotify();

    process.on("SIGINT", () => {
      if (timer) clearTimeout(timer);
      process.exit(0);
    });

    process.on("SIGTERM", () => {
      if (timer) clearTimeout(timer);
      process.exit(0);
    });
  } catch {
    process.exit(1);
  }
}

if (
  import.meta.url.endsWith(process.argv[1]) ||
  process.argv[1].endsWith("monitor-tsunami-notifications.js")
) {
  monitorTsunamiAndNotify().catch(() => {
    process.exit(1);
  });
}
