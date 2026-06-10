import { normalizeNotificationPayload } from "@/services/notification-payload";
import notifee, {
  AndroidCategory,
  AndroidImportance,
  AndroidVisibility,
  EventType,
} from "@notifee/react-native";
import { getApp } from "@react-native-firebase/app";
import { getMessaging, setBackgroundMessageHandler } from "@react-native-firebase/messaging";

let isBackgroundHandlerRegistered = false;
const GEMPA_ALERT_CHANNEL_ID = "gempa_alert_channel_eqeva_v3";
const GEMPA_ALERT_SOUND_NAME = "eq_eva";
const TSUNAMI_ALERT_CHANNEL_ID = "tsunami_alert_channel_tsueva_v1";
const TSUNAMI_ALERT_SOUND_NAME = "tsu_eva";

// Tangani event background Notifee (mutlak dibutuhkan agar Notifee tidak crash)
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.ACTION_PRESS || type === EventType.PRESS) {
    // Pengguna menekan notifikasi atau aksi
  }
});

/**
 * Register background handler once at app startup.
 * This must be called before Firebase messaging is used.
 * Called from index.js (main entry point) only.
 */
export function registerFcmBackgroundHandler() {
  if (isBackgroundHandlerRegistered) return;

  try {
    const app = getApp();
    const messaging = getMessaging(app);

    setBackgroundMessageHandler(messaging, async (remoteMessage) => {
      console.log("BACKGROUND HANDLER TRIGGERED", remoteMessage.data);
      
      if (remoteMessage.data?.send_timestamp) {
        const latency = (Date.now() - parseInt(remoteMessage.data.send_timestamp as string, 10)) / 1000;
        console.log(`[LATENCY LOG] Notifikasi diterima dalam: ${latency.toFixed(3)} detik (Background)`);
      }

      const data = remoteMessage.data ? { ...remoteMessage.data } : undefined;
      const normalized = normalizeNotificationPayload({
        title: data?.title,
        body: data?.body,
        data,
      });
      const isTsunami = normalized.kind === "tsunami_alert";
      const channelConfig = isTsunami
        ? {
            id: TSUNAMI_ALERT_CHANNEL_ID,
            name: "Peringatan Dini Tsunami",
            sound: TSUNAMI_ALERT_SOUND_NAME,
          }
        : {
            id: GEMPA_ALERT_CHANNEL_ID,
            name: "Peringatan Dini Gempa",
            sound: GEMPA_ALERT_SOUND_NAME,
          };

      // Setup channel keamanan tinggi untuk Notifee
      const channelId = await notifee.createChannel({
        id: channelConfig.id,
        name: channelConfig.name,
        importance: AndroidImportance.HIGH,
        bypassDnd: true, // Melewati mode Do Not Disturb
        vibration: true,
        vibrationPattern: [500, 1000, 500, 1000],
        sound: channelConfig.sound,
      });

      // Menampilkan Notifikasi Full-Screen yang "Membangunkan" HP
      await notifee.displayNotification({
        title: normalized.title,
        body: normalized.body,
        data,
        android: {
          channelId,
          sound: channelConfig.sound,
          category: AndroidCategory.ALARM, 
          visibility: AndroidVisibility.PUBLIC, 
          importance: AndroidImportance.HIGH,
          pressAction: {
            id: 'default',
            launchActivity: 'default',
          },
          fullScreenAction: {
            id: 'default', 
            launchActivity: 'default',
          },
        },
      });
    });

    isBackgroundHandlerRegistered = true;
  } catch (error) {
    console.error("Failed to register background handler", error);
  }
}
