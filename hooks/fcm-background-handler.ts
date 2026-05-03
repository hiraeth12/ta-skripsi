import notifee, { AndroidCategory, AndroidImportance, AndroidVisibility, EventType } from '@notifee/react-native';
import { getApp } from "@react-native-firebase/app";
import { getMessaging, setBackgroundMessageHandler } from "@react-native-firebase/messaging";

let isBackgroundHandlerRegistered = false;

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
      // Setup channel keamanan tinggi untuk Notifee
      const channelId = await notifee.createChannel({
        id: 'gempa_alert_channel',
        name: 'Peringatan Dini Gempa',
        importance: AndroidImportance.HIGH,
        bypassDnd: true, // Melewati mode Do Not Disturb
        vibration: true,
        vibrationPattern: [500, 1000, 500, 1000],
      });

      // Menampilkan Notifikasi Full-Screen yang "Membangunkan" HP
      await notifee.displayNotification({
        title: remoteMessage.data?.title || 'Peringatan Gempa Bumiii!',
        body: remoteMessage.data?.body || 'Telah terjadi gempa bumi.',
        data: remoteMessage.data,
        android: {
          channelId,
          category: AndroidCategory.ALARM, // Memicu sebagai ALARM sistem
          visibility: AndroidVisibility.PUBLIC, // Tampil di lock screen
          importance: AndroidImportance.HIGH,
          pressAction: {
            id: 'default',
            launchActivity: 'default',
          },
          fullScreenAction: {
            id: 'default', // Saat diterima, langsung buka aplikasi walau layar mati/terkunci
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
