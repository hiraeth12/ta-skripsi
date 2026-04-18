# Firebase Cloud Messaging (FCM) Setup Guide

Panduan untuk mengatur push notification gempa dirasakan menggunakan Firebase Cloud Messaging.

## Prasyarat

- Project Firebase sudah dibuat
- `@react-native-firebase/messaging` sudah terinstall
- Service account JSON sudah dikonfigurasi

## 1. Konfigurasi Firebase Console

### 1.1 Enable Cloud Messaging

1. Buka [Firebase Console](https://console.firebase.google.com/)
2. Pilih project Anda: `seismotrack-tugas-akhir`
3. Pergi ke **Messaging** (Firebase Cloud Messaging)
4. Klik **Create Campaign** atau **Create first message** untuk verifikasi setup

### 1.2 Dapatkan Server Key (untuk backend)

1. Pergi ke **Project Settings** (gear icon)
2. Tab **Cloud Messaging**
3. Copy **Server Key** untuk digunakan di backend

### 1.3 Setup untuk Android

1. Pergi ke **Project Settings** → **General**
2. Di bagian "Your apps", klik app Android
3. Buka **google-services.json** yang sudah ter-download
4. Pastikan file ada di `android/app/google-services.json`

## 2. Konfigurasi Environment Variables

Tambahkan ke `.env`:

```env
EXPO_PUBLIC_FCM_ENABLED=true
```

## 3. Setup Backend Notification Service

### 3.1 Import Modules

Backend sudah menyediakan 2 file utama:

- `api/database/fcm-notifications.js` - Fungsi untuk mengirim notifikasi
- `api/database/monitor-gempa-notifications.js` - Monitor gempa dan kirim notifikasi

### 3.2 Jalankan Notification Monitor

Di server/backend Anda, jalankan:

```bash
npm run monitor:notifications
```

Atau tambahkan ke `package.json`:

```json
{
  "scripts": {
    "monitor:notifications": "node api/database/monitor-gempa-notifications.js"
  }
}
```

## 4. Frontend Setup

### 4.1 Initialization

FCM sudah otomatis diinisialisasi ketika home screen dimuat:

```typescript
const { getFcmToken } = useFcm();
```

Hook `useFcm()` akan:
- Meminta permission untuk notifikasi
- Mendapatkan FCM token
- Setup listener untuk foreground notifications
- Setup listener untuk background notification tap

### 4.2 Simpan Token User ke Database

Setelah user login, simpan FCM token mereka:

```typescript
import { saveUserFcmToken } from "@/api/database/fcm-notifications";

// After user login success
const fcmToken = getFcmToken();
if (fcmToken && userId) {
  await saveUserFcmToken(userId, fcmToken);
}
```

## 5. Database Structure

Aplikasi menggunakan structure berikut di Firebase Database:

```
/user_fcm_tokens
  /{userId}
    token: "fcm_token_here"
    updatedAt: timestamp

/notification_state
  /last_gempa_dirasakan_event
    eventId: "event_id"
    timestamp: timestamp
```

## 6. Flow Notifikasi

```
1. Backend monitor: Check BMKG API setiap N detik
   ↓
2. Jika ada gempa baru:
   - Extract headline dari API
   - Query semua user tokens dari database
   - Kirim push notification via FCM
   ↓
3. User receive notification:
   - Foreground: Alert dialog + notification sound
   - Background: Notification di notification center
   - Tap: Navigate ke earthquake screen
```

## 7. Testing

### 7.1 Test Foreground Notification

1. App berjalan di foreground
2. Monitor akan mendeteksi gempa baru
3. Alert akan muncul dengan headline dari BMKG

### 7.2 Test Background Notification

1. Close/minimize app
2. Monitor akan mendeteksi gempa baru
3. Notification akan muncul di notification center
4. Tap notification untuk navigate ke earthquake screen

### 7.3 Manual Test via Firebase Console

1. Buka Firebase Console → Messaging
2. Klik "New Campaign"
3. Buat test message
4. Select "Send test message"
5. Input user device yang running app

## 8. Troubleshooting

### Issue: "Failed to get FCM token"

- Pastikan:
  - Permission granted di app
  - Device terhubung internet
  - Firebase app sudah initialized
  - google-services.json sudah benar

### Issue: "Notification tidak diterima"

- Check:
  - Backend monitor service sedang jalan
  - User tokens ada di database
  - Network connection aktif
  - App permissions granted

### Issue: "Backend tidak bisa send notification"

- Pastikan:
  - Firebase Admin SDK initialized dengan service account
  - Service account punya permission untuk messaging
  - Tokens di database valid (belum expired)

## 9. API Reference

### sendGempaDirasakanNotification

```typescript
sendGempaDirasakanNotification(
  headline: string,      // Deskripsi gempa dari BMKG
  magnitude: string,     // Magnitudo gempa
  location: string,      // Lokasi gempa
  depth: string,        // Kedalaman gempa
  timestamp: string     // Waktu gempa
)
```

### saveUserFcmToken

```typescript
saveUserFcmToken(
  userId: string,       // User ID
  token: string        // FCM Token
)
```

### checkAndNotifyNewGempaDirasakan

```typescript
checkAndNotifyNewGempaDirasakan(
  lastKnownEventId: string | null  // Event ID terakhir yang sudah di-notify
)
```

## 10. Notes

- Notifikasi hanya untuk **gempa dirasakan** saja
- Deskripsi ambil dari field `headline` di BMKG API
- Jika `headline` tidak ada, gunakan format: "Gempa M{magnitude} di {location}"
- Token yang invalid/expired otomatis dihapus dari database
- Monitor akan retry dengan backoff jika gagal fetch data

## Support

Untuk masalah lebih lanjut, lihat:
- Firebase Documentation: https://firebase.google.com/docs/cloud-messaging
- React Native Firebase: https://rnfirebase.io/messaging/usage
